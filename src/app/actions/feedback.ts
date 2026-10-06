'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function submitAppFeedback(formData: FormData) {
  const ratingStr = formData.get('rating') as string;
  const category = (formData.get('category') as string)?.trim() || 'experience';
  const message = (formData.get('message') as string)?.trim();

  if (!message || message.length < 5) {
    return { error: 'Please enter at least 5 characters of feedback.' };
  }

  const rating = ratingStr ? parseInt(ratingStr, 10) : null;
  if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) {
    return { error: 'Rating must be between 1 and 5 stars.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let businessId: string | null = null;
    let businessName: string | null = null;
    let userName: string | null = user?.user_metadata?.name || null;
    let userEmail: string | null = user?.email || null;

    if (user) {
      // Fetch user's active business
      const { data: membership } = await supabase
        .from('business_members')
        .select('business_id, businesses(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membership) {
        businessId = membership.business_id;
        const bizData = membership.businesses as any;
        businessName = bizData?.name || null;
      }

      if (!userName) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        userName = profile?.name || user.email?.split('@')[0] || 'User';
      }
    }

    // Insert into app_feedback using Admin Client for guaranteed reliability
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertErr } = await supabaseAdmin
      .from('app_feedback')
      .insert({
        business_id: businessId,
        user_id: user?.id || null,
        user_name: userName,
        user_email: userEmail,
        business_name: businessName,
        rating: rating,
        category: category,
        message: message,
      });

    if (insertErr) {
      console.error('Failed to insert feedback:', insertErr);
      return { error: 'Unable to save feedback at the moment. Please try again.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Feedback submission exception:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}
