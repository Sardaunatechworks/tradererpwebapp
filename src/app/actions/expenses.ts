'use server';

import { revalidatePath } from 'next/cache';
import { Expense, ExpenseCategory, PaymentMethod } from '@/types';
import { getAuthContext, getAdminClient } from '@/lib/auth/context';

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenseCategories(): Promise<{ data?: ExpenseCategory[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: (data as ExpenseCategory[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch expense categories.' };
  }
}

export async function createExpenseCategory(formData: FormData): Promise<{ data?: ExpenseCategory; error?: string }> {
  try {
    const { businessId, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Only owners and admins can create expense categories.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;

    if (!name) return { error: 'Category name is required.' };

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('expense_categories')
      .insert({
        business_id: businessId,
        name,
        description,
      })
      .select('*')
      .single();

    if (error) throw error;
    revalidatePath('/expenses');
    return { data: data as ExpenseCategory };
  } catch (err: any) {
    return { error: err.message || 'Failed to create expense category.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

export async function getExpenses(options?: {
  categoryId?: string;
  search?: string;
  limit?: number;
}): Promise<{ data?: Expense[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    let query = supabase
      .from('expenses')
      .select('*, category:expense_categories(id, name)')
      .eq('business_id', businessId)
      .order('expense_date', { ascending: false });

    if (options?.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.search?.trim()) {
      const s = options.search.trim();
      query = query.or(`description.ilike.%${s}%,note.ilike.%${s}%`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = ((data as any[]) || []).map((e) => ({
      ...e,
      notes: e.note ?? e.notes,
    }));

    return { data: mapped as Expense[] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch expenses.' };
  }
}

export async function createExpense(formData: FormData): Promise<{ data?: Expense; error?: string }> {
  try {
    const { businessId, user } = await getAuthContext();

    const categoryId = (formData.get('categoryId') as string)?.trim() || null;
    const amount = parseFloat((formData.get('amount') as string) || '0');
    const description = (formData.get('description') as string)?.trim();
    const paymentMethod = ((formData.get('paymentMethod') as string) || 'cash') as PaymentMethod;
    const expenseDate = (formData.get('expenseDate') as string) || new Date().toISOString().split('T')[0];
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!description) {
      return { error: 'Expense description is required.' };
    }
    if (isNaN(amount) || amount <= 0) {
      return { error: 'Expense amount must be greater than zero.' };
    }

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        business_id: businessId,
        category_id: categoryId,
        amount,
        description,
        payment_method: paymentMethod,
        expense_date: expenseDate,
        note: notes,
        recorded_by: user.id,
      })
      .select('*, category:expense_categories(id, name)')
      .single();

    if (error) throw error;

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_expense',
      entity_type: 'expense',
      entity_id: data.id,
      metadata: { amount, description, paymentMethod },
    });

    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return {
      data: {
        ...data,
        notes: (data as any).note ?? (data as any).notes,
      } as Expense,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to record expense.' };
  }
}

export async function deleteExpense(id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role === 'staff') {
      return { error: 'Only owners and admins can delete expenses.' };
    }

    const supabaseAdmin = getAdminClient();

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'delete_expense',
      entity_type: 'expense',
      entity_id: id,
    });

    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete expense.' };
  }
}
