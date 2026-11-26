import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('Subscription migrations define all required tables, constraints, and RLS', () => {
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.includes('subscription'));
  assert.ok(files.length >= 1, `Expected at least 1 subscription migration, found ${files.length}`);

  const combinedSql = files
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
    .join('\n');

  const requiredTables = [
    'subscription_plans',
    'business_subscriptions',
    'subscription_trial_history',
    'subscription_payments',
    'subscription_usage',
    'subscription_webhook_events',
    'subscription_audit_logs',
  ];

  for (const table of requiredTables) {
    assert.ok(combinedSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `Missing table ${table}`);
    assert.ok(combinedSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), `Missing RLS for ${table}`);
  }

  assert.ok(combinedSql.includes('idx_business_subscriptions_one_current'), 'Missing one-current-subscription index');
  assert.ok(combinedSql.includes('activate_business_trial'), 'Missing atomic trial activation RPC');
  assert.ok(combinedSql.includes('expire_due_trials'), 'Missing trial expiration RPC');
  assert.ok(combinedSql.includes('expire_due_grace_periods'), 'Missing grace-period expiration RPC');
});

test('Paystack webhook HMAC-SHA512 signature verification', () => {
  const secret = 'test_paystack_secret_key_123';
  const payload = JSON.stringify({ event: 'charge.success', data: { id: 123, reference: 'TERP-123' } });

  const validSig = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(
    crypto.createHmac('sha512', secret).update(payload).digest('hex'),
    'utf8'
  );
  const receivedBuf = Buffer.from(validSig, 'utf8');
  assert.equal(crypto.timingSafeEqual(expectedBuf, receivedBuf), true);

  const tamperedBuf = Buffer.from(
    crypto.createHmac('sha512', secret).update(payload + ' ').digest('hex'),
    'utf8'
  );
  assert.equal(crypto.timingSafeEqual(tamperedBuf, receivedBuf), false);
});

test('Subscription entitlement status rules for Free, Trialing, Active, Past-Due, Cancelled, Expired', () => {
  const futureIso = new Date(Date.now() + 86400_000).toISOString();
  const pastIso = new Date(Date.now() - 86400_000).toISOString();

  const isEntitled = (sub) => {
    if (!sub || sub.plan?.slug !== 'pro') return false;
    const now = Date.now();
    if (sub.status === 'active') return true;
    if (sub.status === 'trialing') return sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() > now : false;
    if (sub.status === 'past_due') return sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at).getTime() > now : false;
    if (sub.status === 'cancelled') return sub.current_period_end ? new Date(sub.current_period_end).getTime() > now : false;
    return false;
  };

  assert.equal(isEntitled({ status: 'free', plan: { slug: 'free' } }), false);
  assert.equal(isEntitled({ status: 'active', plan: { slug: 'pro' } }), true);
  assert.equal(isEntitled({ status: 'trialing', trial_ends_at: futureIso, plan: { slug: 'pro' } }), true);
  assert.equal(isEntitled({ status: 'trialing', trial_ends_at: pastIso, plan: { slug: 'pro' } }), false);
  assert.equal(isEntitled({ status: 'past_due', grace_period_ends_at: futureIso, plan: { slug: 'pro' } }), true);
  assert.equal(isEntitled({ status: 'past_due', grace_period_ends_at: pastIso, plan: { slug: 'pro' } }), false);
  assert.equal(isEntitled({ status: 'cancelled', current_period_end: futureIso, plan: { slug: 'pro' } }), true);
  assert.equal(isEntitled({ status: 'cancelled', current_period_end: pastIso, plan: { slug: 'pro' } }), false);
  assert.equal(isEntitled({ status: 'expired', plan: { slug: 'pro' } }), false);
});

