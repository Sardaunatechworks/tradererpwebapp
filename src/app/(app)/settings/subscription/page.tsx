'use client';

import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Sparkles,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowLeft,
  XCircle,
  Loader2,
  Receipt,
  Info,
} from 'lucide-react';
import {
  activateSevenDayTrial,
  cancelActiveProSubscription,
  getSubscriptionOverview,
  startProUpgradeCheckout,
  verifySubscriptionPayment,
  type SubscriptionOverviewPayload,
} from '@/app/actions/subscription';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatCurrency, formatDate } from '@/utils/formatters';

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentRef = searchParams.get('payment_ref') || searchParams.get('reference');

  const [data, setData] = useState<SubscriptionOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Payment verification state
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Modals
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [nowMs] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getSubscriptionOverview();
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    getSubscriptionOverview().then((res) => {
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!paymentRef) return;
    let active = true;

    verifySubscriptionPayment(paymentRef).then((res) => {
      if (!active) return;
      setVerifyingPayment(false);
      if (res.error) {
        setBannerMsg({ type: 'error', text: res.error });
      } else if (res.verified) {
        setBannerMsg({
          type: 'success',
          text: res.message || 'Payment verified and Pro subscription activated!',
        });
        loadData();
      } else {
        setBannerMsg({
          type: 'error',
          text: res.message || 'Payment verification was unsuccessful.',
        });
      }
      router.replace('/settings/subscription');
    });

    return () => {
      active = false;
    };
  }, [paymentRef, loadData, router]);

  const handleActivateTrial = async () => {
    setActionLoading(true);
    const res = await activateSevenDayTrial();
    setActionLoading(false);
    setTrialModalOpen(false);
    if (res.error) {
      setBannerMsg({ type: 'error', text: res.error });
    } else {
      setBannerMsg({ type: 'success', text: res.message || '7-day Pro trial activated!' });
      await loadData();
    }
  };

  const handleStartCheckout = async () => {
    setActionLoading(true);
    const res = await startProUpgradeCheckout();
    setActionLoading(false);
    if (res.error) {
      setUpgradeModalOpen(false);
      setBannerMsg({ type: 'error', text: res.error });
      return;
    }
    if (res.authorizationUrl) {
      window.location.href = res.authorizationUrl;
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    const res = await cancelActiveProSubscription();
    setActionLoading(false);
    setCancelModalOpen(false);
    if (res.error) {
      setBannerMsg({ type: 'error', text: res.error });
    } else {
      setBannerMsg({
        type: 'success',
        text: res.endsAt
          ? `Recurring billing cancelled. Your Pro access remains active until ${formatDate(res.endsAt)}.`
          : 'Your Pro subscription has been cancelled.',
      });
      await loadData();
    }
  };

  if (loading) {
    return <LoadingState message="Loading subscription & billing..." />;
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-900">{error || 'Unable to load subscription.'}</p>
      </Card>
    );
  }

  const { subscription, plans, usage, trialEligibility, payments, isProEntitled, userRole } = data;
  const isOwner = userRole === 'owner';
  const freePlan = plans.find((p) => p.slug === 'free');
  const proPlan = plans.find((p) => p.slug === 'pro');
  const proPrice = proPlan?.price ?? 1000;

  const statusBadgeVariant: 'success' | 'info' | 'warning' | 'neutral' =
    subscription.status === 'active'
      ? 'success'
      : subscription.status === 'trialing'
      ? 'info'
      : subscription.status === 'past_due' || subscription.status === 'cancelled'
      ? 'warning'
      : 'neutral';

  const trialDaysLeft =
    subscription.status === 'trialing' && subscription.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.trial_ends_at).getTime() - nowMs) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Subscription & Billing"
          description="Manage your business workspace plan, usage limits, 7-day Pro trial, and Paystack billing."
        />
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
        </Link>
      </div>

      {bannerMsg && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2.5 ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : bannerMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          {verifyingPayment ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : bannerMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : bannerMsg.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
          )}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Current Subscription Summary */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Workspace Plan
              </span>
              <Badge variant={statusBadgeVariant}>
                {subscription.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {subscription.plan?.name || 'Free'} Plan{' '}
              <span className="text-base font-medium text-slate-500">
                ({subscription.plan?.slug === 'pro' ? `${formatCurrency(proPrice)}/month` : '₦0/month'})
              </span>
            </h2>
            {subscription.status === 'trialing' && subscription.trial_ends_at && (
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                7-day trial started {formatDate(subscription.trial_started_at!)} ·{' '}
                <strong>{trialDaysLeft} day(s) remaining</strong> (ends {formatDate(subscription.trial_ends_at)}). No automatic charge.
              </p>
            )}
            {subscription.status === 'active' && subscription.next_payment_date && (
              <p className="text-xs text-slate-600">
                Next monthly billing date: <strong>{formatDate(subscription.next_payment_date)}</strong>
              </p>
            )}
            {subscription.status === 'cancelled' && subscription.current_period_end && (
              <p className="text-xs text-amber-700">
                Cancelled at period end · Pro access remains active until{' '}
                <strong>{formatDate(subscription.current_period_end)}</strong>.
              </p>
            )}
            {subscription.status === 'past_due' && subscription.grace_period_ends_at && (
              <p className="text-xs text-rose-700">
                Renewal payment failed · Grace period ends{' '}
                <strong>{formatDate(subscription.grace_period_ends_at)}</strong>.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isOwner && trialEligibility.eligible && (
              <Button variant="secondary" onClick={() => setTrialModalOpen(true)}>
                <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600" />
                Start 7-Day Free Trial
              </Button>
            )}

            {isOwner && (!isProEntitled || subscription.status === 'trialing' || subscription.status === 'past_due') && (
              <Button onClick={() => setUpgradeModalOpen(true)}>
                <CreditCard className="w-4 h-4 mr-1.5" />
                Upgrade to Pro ({formatCurrency(proPrice)}/mo)
              </Button>
            )}

            {isOwner &&
              subscription.plan?.slug === 'pro' &&
              ['active', 'past_due'].includes(subscription.status) && (
                <Button variant="danger" onClick={() => setCancelModalOpen(true)}>
                  Cancel Subscription
                </Button>
              )}
          </div>
        </div>

        {!isOwner && (
          <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
            Only the business owner can activate trials, upgrade, or cancel billing.
          </p>
        )}
      </Card>

      {/* Usage Indicators */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Workspace Usage & Plan Allowances</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usage.map((item) => {
            const pct =
              item.limit && item.limit > 0
                ? Math.min(100, Math.round((item.currentUsage / item.limit) * 100))
                : 0;
            return (
              <div
                key={item.feature}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.label}</span>
                  <span className="text-slate-500">{item.periodLabel}</span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {item.currentUsage}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {item.limit === null ? 'Unlimited' : item.limit}
                  </span>
                </div>
                {item.limit !== null && (
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.isExceeded ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Free vs Pro Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">{freePlan?.name || 'Free'}</h3>
              {subscription.plan?.slug === 'free' && <Badge variant="neutral">Current Plan</Badge>}
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">
              ₦0 <span className="text-xs font-normal text-slate-500">/ forever</span>
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {freePlan?.description || 'Essential business management tools.'}
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1 business branch workspace</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sales POS, Inventory, Customer CRM & Debt tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Basic sales & expense reports</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No payment card required</span>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="p-6 border-emerald-200 bg-emerald-50/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">{proPlan?.name || 'Pro'}</h3>
              {isProEntitled && (
                <Badge variant="success">
                  {subscription.status === 'trialing' ? 'Trial Active' : 'Current Plan'}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">
              {formatCurrency(proPrice)}{' '}
              <span className="text-xs font-normal text-slate-500">/ month</span>
            </p>
            <p className="text-xs text-slate-500 mb-4">
              {proPlan?.description || 'Full TraderERP capabilities for growing businesses.'}
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited branches (when multi-branch is enabled)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlimited products, monthly sales & customers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Advanced profit & performance reporting</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Full data export & priority Paystack billing</span>
              </li>
            </ul>
          </div>

          {isOwner && (!isProEntitled || subscription.status === 'trialing') && (
            <div className="mt-5 pt-4 border-t border-emerald-100">
              <Button className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                Upgrade to Pro — {formatCurrency(proPrice)}/month
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Payment History */}
      {(userRole === 'owner' || userRole === 'admin') && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
          </div>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-500">No payment transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Reference</th>
                    <th className="py-2 pr-4 font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Channel</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 font-mono text-slate-800">{p.payment_reference}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 pr-4 capitalize text-slate-600">
                        {p.payment_channel || 'Paystack'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          variant={
                            p.status === 'success'
                              ? 'success'
                              : p.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {formatDate(p.paid_at || p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Trial Activation Modal */}
      <Modal
        isOpen={trialModalOpen}
        onClose={() => setTrialModalOpen(false)}
        title="Start 7-Day TraderERP Pro Trial"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Activate 7 days of full TraderERP Pro access for your business workspace.
          </p>
          <ul className="space-y-1.5 text-slate-700">
            <li>• No payment card or bank details required.</li>
            <li>• You will not be charged automatically when the 7-day trial ends.</li>
            <li>• Available once per business workspace.</li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setTrialModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleActivateTrial} disabled={actionLoading}>
              {actionLoading ? 'Activating...' : 'Activate 7-Day Trial'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Checkout Modal */}
      <Modal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Upgrade to TraderERP Pro"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="font-semibold text-slate-900">Billing Disclosure</p>
            <p>
              • Price: <strong>{formatCurrency(proPrice)} per month</strong> (NGN).
            </p>
            <p>• Monthly recurring billing via Paystack after your explicit authorisation.</p>
            <p>• You can cancel anytime from Subscription & Billing; Pro access continues until the end of your paid period.</p>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secured by Paystack. Pro activates only after server-side payment verification.</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setUpgradeModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartCheckout} disabled={actionLoading}>
              {actionLoading ? 'Redirecting to Paystack...' : `Proceed to Pay ${formatCurrency(proPrice)}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Pro Subscription"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            Are you sure you want to cancel your monthly Pro subscription?
          </p>
          <p>
            Future recurring charges will be stopped immediately. Your Pro access will remain active until{' '}
            <strong>
              {subscription.current_period_end
                ? formatDate(subscription.current_period_end)
                : 'the end of your billing period'}
            </strong>
            , and all your business records will be preserved.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Keep Pro Plan
            </Button>
            <Button variant="danger" onClick={handleCancelSubscription} disabled={actionLoading}>
              {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading subscription & billing..." />}>
      <SubscriptionContent />
    </Suspense>
  );
}
