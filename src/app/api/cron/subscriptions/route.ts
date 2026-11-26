import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionAdminClient } from '@/lib/subscription/admin-client';
import { downgradeToFree } from '@/lib/subscription/subscription-service';

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

async function runScheduledReconciliation() {
  const admin = getSubscriptionAdminClient();

  const [{ data: expiredTrials }, { data: expiredGrace }] = await Promise.all([
    admin.rpc('expire_due_trials'),
    admin.rpc('expire_due_grace_periods'),
  ]);

  // Downgrade cancelled subscriptions whose paid period has ended
  const nowIso = new Date().toISOString();
  const { data: dueCancelled } = await admin
    .from('business_subscriptions')
    .select('id, business_id')
    .eq('is_current', true)
    .eq('status', 'cancelled')
    .not('current_period_end', 'is', null)
    .lte('current_period_end', nowIso);

  let cancelledDowngrades = 0;
  for (const row of dueCancelled || []) {
    await downgradeToFree({
      businessId: row.business_id,
      subscriptionId: row.id,
      reason: 'cancelled_period_ended_cron',
      actorType: 'system',
    });
    cancelledDowngrades += 1;
  }

  return {
    expiredTrials: Number(expiredTrials ?? 0),
    expiredGracePeriods: Number(expiredGrace ?? 0),
    cancelledDowngrades,
    ranAt: nowIso,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runScheduledReconciliation();
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

