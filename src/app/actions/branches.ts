'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess, validateReadAccess } from '@/lib/security';

// Helper: initialize Supabase Admin Client
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// 1. Fetch only ACTIVE branches for selectors, context mapping
export async function getBranches() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Live security check for read access
  try {
    await validateReadAccess(supabase, user.id);
  } catch (err) {
    console.error('getBranches read access denied:', err);
    return [];
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return [];

  try {
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching branches:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('getBranches action exception:', err);
    return [];
  }
}

// 2. Fetch ALL branches (active and restricted) with manager information for dashboard view
export async function getAllBranches() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Live security check for read access
  try {
    await validateReadAccess(supabase, user.id);
  } catch (err) {
    console.error('getAllBranches read access denied:', err);
    return [];
  }

  const businessId = user.app_metadata?.business_id;
  if (!businessId) return [];

  try {
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*, manager:users!branches_manager_id_fkey(id, name, email)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all branches:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('getAllBranches action exception:', err);
    return [];
  }
}

// 3. Create a branch and map manager if assigned
export async function createBranch(data: {
  name: string;
  address: string;
  managerId: string | null;
}) {
  const { name, address, managerId } = data;

  if (!name) {
    return { error: 'Branch name is required.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const role = user.app_metadata?.role;
    const businessId = user.app_metadata?.business_id;

    if (!businessId) {
      return { error: 'No business workspace found.' };
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      return { error: 'Access denied. Only business Owners and Admins can create branches.' };
    }

    const supabaseAdmin = getAdminClient();

    // SECURITY CHECK: Verify manager belongs to user's business
    if (managerId) {
      const { data: managerCheck } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', managerId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!managerCheck) {
        return { error: 'Manager profile not found in your business workspace.' };
      }
    }

    // Insert the branch record
    const { data: newBranch, error: insertErr } = await supabaseAdmin
      .from('branches')
      .insert({
        business_id: businessId,
        name,
        address: address || '',
        manager_id: managerId || null,
        is_active: true
      })
      .select('id')
      .single();

    if (insertErr || !newBranch) {
      return { error: insertErr?.message || 'Failed to create branch record.' };
    }

    // Link the manager in public.user_branches if selected
    if (managerId) {
      const { error: userBranchErr } = await supabaseAdmin
        .from('user_branches')
        .upsert({
          user_id: managerId,
          branch_id: newBranch.id,
          business_id: businessId
        }, { onConflict: 'user_id,branch_id' });

      if (userBranchErr) {
        console.error('Failed to link manager in user_branches:', userBranchErr.message);
      }
    }

    revalidatePath('/branches');
    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Create Branch Error:', err);
    return { error: err.message || 'An error occurred during branch creation.' };
  }
}

// 4. Update branch details and manager
export async function updateBranch(
  branchId: string,
  data: {
    name: string;
    address: string;
    managerId: string | null;
  }
) {
  const { name, address, managerId } = data;

  if (!name) {
    return { error: 'Branch name is required.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const role = user.app_metadata?.role;
    const businessId = user.app_metadata?.business_id;

    if (!businessId) {
      return { error: 'No business workspace found.' };
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // SECURITY CHECK: Verify manager belongs to user's business
    if (managerId) {
      const { data: managerCheck } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', managerId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (!managerCheck) {
        return { error: 'Manager profile not found in your business workspace.' };
      }
    }

    // 1. Get current branch details to check for previous manager
    const { data: currentBranch } = await supabaseAdmin
      .from('branches')
      .select('manager_id')
      .eq('id', branchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!currentBranch) {
      return { error: 'Branch not found.' };
    }

    // 2. Update branch information
    const { error: updateErr } = await supabaseAdmin
      .from('branches')
      .update({
        name,
        address: address || '',
        manager_id: managerId || null
      })
      .eq('id', branchId)
      .eq('business_id', businessId);

    if (updateErr) {
      return { error: updateErr.message };
    }

    // 3. Handle manager change in user_branches
    const prevManagerId = currentBranch.manager_id;
    if (managerId !== prevManagerId) {
      // If there was a previous manager, remove their link from user_branches
      if (prevManagerId) {
        await supabaseAdmin
          .from('user_branches')
          .delete()
          .eq('user_id', prevManagerId)
          .eq('branch_id', branchId);
      }

      // Link new manager to user_branches
      if (managerId) {
        await supabaseAdmin
          .from('user_branches')
          .upsert({
            user_id: managerId,
            branch_id: branchId,
            business_id: businessId
          }, { onConflict: 'user_id,branch_id' });
      }
    }

    revalidatePath('/branches');
    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Update Branch Error:', err);
    return { error: err.message || 'An error occurred during branch update.' };
  }
}

// 5. Toggle active status of a branch (restrict/unrestrict)
export async function toggleBranchStatus(branchId: string, isActive: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const role = user.app_metadata?.role;
    const businessId = user.app_metadata?.business_id;

    if (!businessId) {
      return { error: 'No business workspace found.' };
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('branches')
      .update({ is_active: isActive })
      .eq('id', branchId)
      .eq('business_id', businessId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/branches');
    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Toggle Branch Status Error:', err);
    return { error: err.message || 'An error occurred.' };
  }
}

// 6. Delete a branch cleanly if no sales history exists
export async function deleteBranch(branchId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const role = user.app_metadata?.role;
    const businessId = user.app_metadata?.business_id;

    if (!businessId) {
      return { error: 'No business workspace found.' };
    }

    if (role !== 'OWNER' && role !== 'ADMIN') {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target branch belongs to user's business
    const { data: branchCheck } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!branchCheck) {
      return { error: 'Branch context not found or unauthorized.' };
    }

    // Verify there are no sales records referencing this branch
    const { count, error: salesCheckErr } = await supabaseAdmin
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    if (salesCheckErr) {
      return { error: `Failed audit validation checks: ${salesCheckErr.message}` };
    }

    if (count && count > 0) {
      return {
        error: 'Cannot delete branch because it has transaction history. Please restrict the branch status to block logins instead.'
      };
    }

    // Delete branch (cascades user_branches, inventory, branch_product_prices due to ON DELETE CASCADE constraints)
    const { error: deleteErr } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', branchId)
      .eq('business_id', businessId);

    if (deleteErr) {
      return { error: deleteErr.message };
    }

    revalidatePath('/branches');
    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    console.error('Delete Branch Error:', err);
    return { error: err.message || 'An error occurred during deletion.' };
  }
}
