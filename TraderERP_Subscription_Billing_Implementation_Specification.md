# TRADERERP
## Subscription & Billing System
### Development-Ready Product and Technical Specification

**Product:** TraderERP  
**Module:** Subscription & Billing Management  
**Version:** 1.0  
**Subscription Model:** Free + Pro  
**Payment Provider:** Paystack  
**Monthly Pro Price:** ₦1,000  
**Free Trial:** 7 days  
**Architecture:** Existing TraderERP architecture

---

# PART A: PRODUCT REQUIREMENTS

## 1. Project Overview

TraderERP is a multi-tenant enterprise management platform designed for retail, wholesale and branch-based businesses.

The platform currently provides:

- Sales POS
- Inventory Control
- Customer CRM
- Debt Management
- Advanced Reporting
- Branch Management
- Business Management
- Platform Administration

This development introduces a subscription and billing system that allows businesses to access TraderERP through a permanent Free plan or a paid Pro plan.

The system must support subscription management at business-workspace level rather than charging individual employees.

The implementation must preserve the existing application architecture, database relationships, authentication system, security policies and user experience.

## 2. Business Objectives

The subscription system should:

1. Introduce a sustainable recurring-revenue model.
2. Allow new and existing businesses to use TraderERP through a Free plan.
3. Encourage businesses to upgrade when they require higher usage limits.
4. Provide a seven-day Pro trial to eligible businesses.
5. Automate recurring monthly payments through Paystack.
6. Give business owners visibility into their subscriptions and payments.
7. Give platform administrators control over subscription plans and billing operations.
8. Protect existing business records during downgrades, failed payments and cancellations.

## 3. Confirmed Subscription Configuration

### Free Plan

- Price: ₦0.
- Permanent availability.
- One business branch.
- Configurable limits for selected resources.
- Access to essential business management capabilities.
- No payment information required.
- No automatic charges.

### Pro Plan

- Price: ₦1,000.
- Monthly billing.
- Unlimited branches.
- Higher or unlimited usage limits according to configured entitlements.
- Access to Pro-exclusive capabilities.
- Paystack payment integration.
- Automatic monthly renewal after explicit recurring-payment authorisation.

### Seven-Day Free Trial

- Duration: Seven calendar days.
- Available once per business workspace.
- Activated voluntarily by an authorised business owner.
- No payment details required at activation.
- No charge when the trial expires.
- Trial expiration automatically restores Free entitlements.
- Trial eligibility must be enforced on the backend and database.
- Creating another business workspace must not allow the same business owner to bypass trial eligibility if the product's anti-abuse policy identifies that owner as already having used a trial. The primary guaranteed restriction is one trial per business.

## 4. Free and Pro Feature Matrix

All plan limits must be configurable through the database.

| Feature | Free | Pro |
|---|---|---|
| Business workspace | Yes | Yes |
| Branch management | 1 branch | Unlimited |
| Sales POS | Yes, subject to configured limits | Full access |
| Product management | Configurable limit | Unlimited |
| Inventory management | Yes, subject to configured limits | Full access |
| Customer CRM | Configurable limit | Unlimited |
| Debt management | Yes, subject to configured limits | Full access |
| Basic reporting | Yes | Yes |
| Advanced reporting | Restricted | Full access |
| Data export | Configurable | Full access |
| Subscription dashboard | Yes | Yes |
| Payment history | Yes | Yes |

Important implementation rule:

The proposed Free limits for products, sales and customers must remain configurable. Do not assume that illustrative figures in earlier planning discussions are final business decisions.

Before enforcing any unapproved limits in production, obtain the final approved values.

Do not introduce restrictions to modules that do not currently exist in the repository.

---

# PART B: TECHNICAL ARCHITECTURE

## 5. Existing Technology Stack

The implementation must retain the following stack:

| Component | Technology |
|---|---|
| Frontend | Next.js 16 App Router |
| UI | React |
| Backend | Next.js Server Actions and Route Handlers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Security | PostgreSQL Row Level Security |
| State Management | Zustand |
| Styling | Tailwind CSS v4 and Vanilla CSS |
| Icons | Lucide React |
| Database migrations | Supabase migrations |
| Payment gateway | Paystack |

Do not migrate the application to another framework, database or authentication provider.

## 6. Architecture Principles

The subscription module must follow these principles:

1. Business-level subscriptions.
2. Server-side entitlement enforcement.
3. Database-backed usage tracking.
4. Secure payment verification.
5. Idempotent webhook processing.
6. Multi-tenant isolation.
7. Existing role and permission preservation.
8. No loss of existing business records.
9. Reusable subscription services.
10. Configurable plan limits.

The frontend must never be the source of truth for subscription status, payment status or usage permissions.

## 7. Proposed Application Structure

Inspect the existing repository before creating or modifying files.

Use the following as a proposed organisational structure, adapting it to the project's actual conventions.

```text
src/
├── app/
│   ├── (app)/
│   │   └── settings/
│   │       └── subscription/
│   │           └── page.tsx
│   │
│   ├── (platform)/
│   │   └── platform/
│   │       └── subscriptions/
│   │           └── page.tsx
│   │
│   ├── actions/
│   │   └── subscription.ts
│   │
│   └── api/
│       └── webhooks/
│           └── paystack/
│               └── route.ts
│
├── components/
│   └── subscription/
│       ├── PricingSection.tsx
│       ├── PlanCard.tsx
│       ├── SubscriptionStatus.tsx
│       ├── UsageProgress.tsx
│       ├── TrialBanner.tsx
│       ├── TrialActivationModal.tsx
│       ├── UpgradeModal.tsx
│       ├── PaymentHistory.tsx
│       └── CancelSubscriptionModal.tsx
│
└── lib/
    └── subscription/
        ├── plans.ts
        ├── subscription-service.ts
        ├── entitlement-service.ts
        ├── usage-service.ts
        ├── trial-service.ts
        ├── billing-service.ts
        ├── paystack.ts
        ├── access-control.ts
        └── types.ts

supabase/
└── migrations/
    ├── [timestamp]_subscription_plans.sql
    ├── [timestamp]_business_subscriptions.sql
    ├── [timestamp]_subscription_payments.sql
    ├── [timestamp]_subscription_usage.sql
    ├── [timestamp]_subscription_webhooks.sql
    ├── [timestamp]_subscription_audit_logs.sql
    ├── [timestamp]_subscription_rls_policies.sql
    └── [timestamp]_subscription_functions.sql
```

Avoid creating duplicate services or replacing existing authentication, business-context or permission utilities.

---

# PART C: DATABASE DESIGN

## 8. Database Tables

Create the subscription database structure through sequential timestamped Supabase migrations.

### 8.1 subscription_plans

Stores available subscription plans.

Suggested fields:

- id: UUID primary key.
- name: Free or Pro.
- slug: Unique plan identifier.
- description: Plan description.
- price: Numeric.
- currency: NGN.
- billing_interval: monthly or none.
- trial_days: Integer.
- branch_limit: Nullable integer.
- feature_limits: JSONB.
- feature_entitlements: JSONB.
- paystack_plan_code: Nullable text.
- is_active: Boolean.
- created_at.
- updated_at.

Use NULL or an explicit unlimited representation consistently for unlimited entitlements. Do not interpret missing configuration as unlimited.

### 8.2 business_subscriptions

Stores the current and historical subscription relationship for each business.

Suggested fields:

- id: UUID primary key.
- business_id: Foreign key to businesses.
- plan_id: Foreign key to subscription_plans.
- status: Subscription status.
- trial_started_at.
- trial_ends_at.
- current_period_start.
- current_period_end.
- next_payment_date.
- cancel_at_period_end: Boolean.
- cancelled_at.
- ended_at.
- paystack_customer_code.
- paystack_subscription_code.
- paystack_email_token: Securely stored only if needed for the verified provider integration.
- created_at.
- updated_at.

Add the necessary constraints and indexes.

There must be one authoritative current subscription per business. If historical subscriptions are retained in this table, enforce one current record through an appropriate database constraint or a clearly defined current-record model.

### 8.3 subscription_payments

Stores all payment attempts and verified payment outcomes.

Suggested fields:

- id: UUID primary key.
- business_id.
- subscription_id.
- payment_reference: Unique.
- paystack_transaction_id.
- amount.
- currency.
- status.
- payment_channel.
- gateway.
- paid_at.
- failure_reason.
- raw_gateway_metadata: Sanitised JSONB.
- created_at.
- updated_at.

Never store card numbers, CVV or sensitive payment credentials.

### 8.4 subscription_usage

Tracks usage against the limits configured for each plan.

Suggested fields:

- id: UUID primary key.
- business_id.
- metric_key.
- period_start.
- period_end.
- usage_count.
- created_at.
- updated_at.

Create a unique constraint on the business, metric and applicable usage period.

Usage must be calculated using the appropriate billing or calendar period defined for each metric. Do not mix lifetime counts with monthly counts.

### 8.5 subscription_webhook_events

Stores received Paystack webhook events.

Suggested fields:

- id: UUID primary key.
- gateway_event_id or unique provider event/reference identifier.
- event_type.
- payment_reference.
- processing_status.
- payload_metadata: Sanitised JSONB.
- received_at.
- processed_at.
- error_message.

Create unique constraints that prevent the same provider event from being processed more than once.

### 8.6 subscription_audit_logs

Records important subscription changes.

Suggested fields:

- id: UUID primary key.
- business_id.
- subscription_id.
- actor_user_id.
- actor_type.
- action.
- previous_value: JSONB.
- new_value: JSONB.
- metadata: JSONB.
- created_at.

Record trial activation, upgrades, renewals, cancellations, downgrades, administrative overrides and plan changes.

## 9. Relationships

Use the existing businesses table as the root tenant.

```text
businesses
    |
    | one-to-one current subscription
    |
business_subscriptions
    |
    | many-to-one
    |
subscription_plans

business_subscriptions
    |
    | one-to-many
    |
subscription_payments

businesses
    |
    | one-to-many
    |
subscription_usage

business_subscriptions
    |
    | one-to-many
    |
subscription_audit_logs
```

Reuse the existing business IDs and user IDs.

Do not create a second business identity or independent user authentication system.

## 10. Initial Plan Seeding

Seed two plans.

### Free

```text
slug: free
price: 0
currency: NGN
billing_interval: none
trial_days: 0
branch_limit: 1
is_active: true
```

### Pro

```text
slug: pro
price: 1000
currency: NGN
billing_interval: monthly
trial_days: 0
branch_limit: unlimited
is_active: true
```

Additional resource limits must be configurable and populated only with approved values.

Plan updates must not unexpectedly change the terms of existing paid subscriptions.

---

# PART D: SUBSCRIPTION BUSINESS LOGIC

## 11. Subscription Statuses

Implement a controlled subscription status model.

- free
- trialing
- active
- past_due
- cancelled
- expired

Keep plan identity separate from subscription status.

Examples:

- Pro + trialing.
- Pro + active.
- Pro + past_due.
- Free + free.

A cancelled subscription can remain entitled until its paid period ends.

## 12. Default Business Subscription

When a new business workspace is created:

1. Create or associate its Free subscription.
2. Ensure it receives the Free plan.
3. Ensure its initial branch is counted correctly.
4. Initialise usage tracking where applicable.
5. Do not create a Paystack customer or transaction.
6. Do not automatically start a trial.

New businesses start on Free.

The implementation must also handle existing businesses that were created before this module was deployed.

Create a safe backfill migration or administrative initialisation procedure that assigns Free to existing businesses without modifying their business records.

## 13. Trial Activation

Implement a secure trial activation service.

Rules:

- Only authorised business owners can activate the trial.
- A trial lasts seven days from activation.
- No payment information is required.
- No payment transaction is created.
- A business can only use one trial.
- Repeated requests must not create additional trials.
- Trial eligibility must be checked server-side.
- Trial activation must be atomic to prevent simultaneous requests from activating multiple trials.
- Record trial activation in the audit log.

Create a database-level mechanism that guarantees one trial per business.

For example, use a permanent trial-consumption timestamp or a dedicated trial history record with a unique business constraint.

Do not rely solely on the current subscription status to enforce eligibility.

## 14. Trial Expiration

When the trial expires:

1. Identify the business subscription.
2. Verify that its trial period has ended.
3. Change the subscription to Free.
4. Restore Free entitlements.
5. Remove Pro-only access.
6. Preserve all business records.
7. Record the transition in the audit log.

Trial expiration must not initiate a payment.

Expiration must be handled through a reliable scheduled process or another verified server-side mechanism. Do not rely exclusively on a user opening the application.

Make expiration processing idempotent.

## 15. Free Plan Usage Limits

Implement a central entitlement service.

Example:

```text
checkEntitlement(businessId, featureKey)
```

The service should:

1. Resolve the authenticated user.
2. Resolve the active business workspace.
3. Verify business membership and permission.
4. Retrieve the current subscription.
5. Resolve the applicable plan entitlements.
6. Retrieve relevant usage.
7. Determine whether the requested operation is allowed.
8. Return a structured result.

Example:

```json
{
  "allowed": false,
  "reason": "PLAN_LIMIT_REACHED",
  "feature": "products",
  "currentUsage": 30,
  "limit": 30,
  "plan": "free",
  "upgradeAvailable": true
}
```

Use consistent structured errors.

Do not implement plan limits independently inside multiple components.

### Enforcement requirements

- Check limits on the server.
- Check limits before resource creation.
- Protect concurrent operations.
- Ensure branch limits cannot be bypassed through direct database requests.
- Ensure limits are business-scoped.
- Preserve records after downgrade.
- Never rely only on frontend counters.

Where possible, enforce critical limits inside PostgreSQL functions or transactional database operations to avoid race conditions.

## 16. Branch Management Rules

Free:

- Maximum of one active branch.
- Existing primary branch remains available.
- Attempts to create additional branches must be blocked.
- Branch creation checks must occur on the server and database.

Pro:

- Unlimited active branches.
- Existing branch permissions continue to apply.
- Managers and staff remain restricted to their assigned branches.
- Subscription upgrades must not alter existing staff permissions.

If a business downgrades while operating multiple branches:

- Do not delete branches.
- Do not delete inventory records.
- Do not delete sales records.
- Do not delete staff assignments.
- Preserve existing records.
- Block additional branch creation.
- Clearly notify the business owner that the workspace exceeds the Free branch allowance.
- Define an appropriate reactivation or branch-management flow before allowing any destructive action.

Existing businesses with more than one branch must not be silently locked out or have their branches disabled during initial migration.

## 17. Downgrade Policy

When Pro access ends:

- Restore Free entitlements.
- Preserve all historical records.
- Preserve sales and invoices.
- Preserve customer records.
- Preserve inventory history.
- Preserve debt records.
- Preserve staff accounts.
- Preserve branch records.
- Prevent new actions that exceed Free limits.
- Allow access to existing records according to the final Free access policy.

Never delete data because of an expired subscription.

---

# PART E: PAYSTACK INTEGRATION

## 18. Payment Configuration

Use Paystack as the payment gateway.

Configuration must use server-side environment variables.

```env
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

Use the correct Paystack credentials for each environment.

Never expose the secret key to client-side code.

Never hardcode production credentials in the repository.

The frontend public key may be exposed as intended by Paystack, but payment initialization and verification must remain server-side.

## 19. Pro Subscription Checkout

When a business owner selects Pro:

1. Verify authenticated session.
2. Verify business ownership or authorised billing permission.
3. Check that the business is eligible to purchase Pro.
4. Create or retrieve its Paystack customer.
5. Initialise the monthly Pro checkout using the configured Paystack plan.
6. Use the correct amount and NGN currency.
7. Provide a unique payment reference.
8. Store the pending payment record.
9. Return the Paystack checkout URL.
10. Redirect the user to Paystack.

The checkout must clearly disclose:

- ₦1,000 per month.
- Monthly recurring billing.
- The date or conditions of the next charge.
- That the user is authorising recurring payments.
- How cancellation works.

The initial checkout must establish recurring authorisation through a Paystack-supported subscription or recurring billing flow.

Verify the current Paystack API requirements and the merchant account's recurring billing capabilities before implementing this process.

Do not assume that a successful one-time transaction automatically establishes valid recurring billing.

## 20. Payment Verification

After checkout, the frontend may receive a payment reference.

The application must verify that reference on the server using Paystack.

Validate:

- Transaction reference.
- Transaction status.
- Expected amount.
- Expected currency.
- Expected business.
- Expected payment purpose.
- Expected Paystack customer or subscription relationship.

Only verified payments may activate Pro access.

Never activate Pro merely because the browser redirected to a success page.

## 21. Recurring Billing

Pro subscribers must renew monthly.

The system should:

- Store the Paystack subscription identifier.
- Store the relevant customer reference.
- Store billing dates.
- Process verified renewal events.
- Update payment history.
- Extend the subscription period after successful renewal.
- Handle failed renewals.
- Avoid duplicate payment records.
- Avoid duplicate renewal extensions.

Use Paystack's supported subscription and authorisation mechanisms.

The application must not independently charge a stored card without the required provider authorisation.

## 22. Webhook Processing

Implement:

```text
POST /api/webhooks/paystack
```

The endpoint must:

1. Read the raw request body.
2. Verify the Paystack webhook signature according to the current provider specification.
3. Reject invalid signatures.
4. Identify the event.
5. Store the event using an idempotency key.
6. Verify relevant transaction information with Paystack where required.
7. Process the event using a database transaction.
8. Update payment and subscription records.
9. Record the result.
10. Return the appropriate HTTP response.

Handle relevant events supported by the configured Paystack integration, including:

- Successful transactions.
- Failed transactions where available.
- Subscription creation.
- Subscription renewal.
- Subscription cancellation.
- Subscription disablement.
- Invoice payment success or failure where supported.

Do not assume every event exists in every Paystack integration. Confirm actual event names and payload structures from the current documentation.

Duplicate events must not cause duplicate renewals.

Failed event processing must be logged and safely retryable.

## 23. Payment Failure Handling

Initial grace-period policy:

- Three days of grace after a failed renewal, subject to configuration.
- Mark the subscription as past_due.
- Notify the business owner.
- Allow the owner to retry payment or update billing authorisation.
- Retain the Pro entitlement during the grace period if the policy allows it.
- After grace expiration, downgrade to Free.
- Preserve all business data.

Do not treat a user cancellation as a failed payment.

## 24. Cancellation

Provide a cancellation process.

The business owner must be able to:

- View current billing information.
- Request cancellation.
- Confirm cancellation.
- Understand when Pro access will end.

Recommended default:

Cancellation stops future renewal and preserves Pro access until the end of the already-paid billing period.

If Paystack requires provider-side cancellation, synchronise that cancellation with TraderERP.

Do not cancel the subscription in the local database while leaving recurring provider billing active.

Record all cancellation operations.

---

# PART F: USER INTERFACE

## 25. Pricing and Plan Selection

Create a professional pricing interface that matches the existing TraderERP design system.

Display:

### Free

- ₦0.
- One branch.
- Configured usage allowances.
- Essential business management tools.
- Basic reports.

### Pro

- ₦1,000/month.
- Unlimited branches.
- Higher or unlimited configured usage allowances.
- Advanced reports.
- Full Pro entitlements.

Show the differences clearly.

The interface must display the user's current plan and must not encourage upgrading when the user already has active Pro access.

## 26. Subscription Dashboard

Create a subscription management page.

Suggested route:

```text
/settings/subscription
```

The page should show:

- Current plan.
- Subscription status.
- Trial status.
- Trial start date.
- Trial expiration date.
- Next payment date.
- Monthly subscription price.
- Branch usage.
- Product usage.
- Sales usage.
- Customer usage.
- Available plan limits.
- Upgrade option.
- Cancellation option.
- Payment history.

Only display metrics that are actually implemented and supported by the database.

## 27. Trial Interface

When a business activates a trial, display a clear notification.

Example:

"Your TraderERP Pro trial is now active. Enjoy seven days of access to Pro features. You will not be charged automatically when your trial ends."

Display:

- Trial remaining days.
- Trial expiration date.
- Available Pro features.
- Upgrade option.

Do not imply that payment details have been saved.

## 28. Usage Indicators

For restricted Free resources, display usage information.

Example:

```text
Products

18 of 30 used

[Progress indicator]

Upgrade to Pro for higher usage limits.
```

The actual values must come from the backend.

Do not hardcode usage numbers.

## 29. Upgrade Prompts

When a Free user reaches a limit:

- Explain which limit has been reached.
- Explain what the user can do next.
- Provide a clear upgrade option.
- Display the Pro price.
- Avoid aggressive or repeated popups.

Example:

"You have reached your Free plan product limit. Upgrade to TraderERP Pro for more room to manage your inventory."

## 30. Payment Screens

Create the following states:

- Checkout initiated.
- Payment pending.
- Payment successful.
- Payment failed.
- Payment verification in progress.
- Payment verification unsuccessful.
- Subscription activated.

Payment success must only be displayed after server-side verification.

## 31. Payment History

Display:

- Transaction reference.
- Amount.
- Currency.
- Payment date.
- Payment method where available.
- Transaction status.
- Subscription period covered.

Provide receipt access where supported by verified payment data.

---

# PART G: PLATFORM ADMINISTRATION

## 32. Platform Subscription Management

Extend the existing `/platform` console.

Do not create a separate administrator authentication system.

Add a subscription management section accessible only to authorised platform administrators.

Features:

- Total Free businesses.
- Active Pro subscriptions.
- Businesses on trial.
- Past-due subscriptions.
- Expired subscriptions.
- Cancelled subscriptions.
- Monthly recurring revenue based on verified successful payments.
- Payment failure statistics.
- Search businesses by name or ID.
- Inspect subscription details.
- Inspect payment history.
- View trial history.
- View subscription audit logs.
- View webhook processing failures.
- Configure plan entitlements and limits.

## 33. Administrative Controls

Authorised administrators may:

- Inspect subscriptions.
- Activate or suspend subscriptions under a documented policy.
- Apply approved manual adjustments.
- Review failed payments.
- Review trial records.
- Configure plan limits.

Every manual override must:

- Require the appropriate platform permission.
- Record the administrator identity.
- Record the previous and new values.
- Require a reason.
- Be written to the audit log.

Manual activation must not falsely create a Paystack payment record.

## 34. Revenue Analytics

Calculate monthly recurring revenue from actual verified active recurring subscriptions, using a clearly defined reporting policy.

Do not include:

- Pending payments.
- Failed transactions.
- Duplicate webhook events.
- Unverified transactions.
- One-time payments that are not recurring subscriptions.

Keep gross collections and recurring revenue as distinct metrics.

---

# PART H: SECURITY AND MULTI-TENANT PROTECTION

## 35. Row Level Security

All subscription tables must have appropriate RLS policies.

Business users must only access subscription information belonging to their authorised business workspace.

Only authorised business owners or billing administrators may manage subscriptions.

Staff must not be allowed to:

- Activate trials.
- Upgrade subscriptions.
- Cancel subscriptions.
- Change billing details.
- Modify subscription records.

Use the existing business membership and role validation system.

Platform administrators must use the existing platform permission model.

## 36. Server-Side Validation

Every subscription mutation must validate:

- Authenticated user.
- Active user status.
- Business membership.
- Business ownership or billing permission.
- Subscription eligibility.
- Relevant plan configuration.
- Payment status when applicable.

Reuse existing `validateWriteAccess` and other applicable validation utilities.

Do not bypass existing security checks.

## 37. Service Role Security

If Supabase service-role credentials are needed for secure webhook or administrative operations:

- Use them exclusively on the server.
- Never expose them to client code.
- Restrict access to the smallest necessary operations.
- Validate the relevant business and event before making changes.
- Do not use service-role access as a substitute for authorisation.

---

# PART I: AUTOMATION AND SCHEDULED OPERATIONS

## 38. Required Background Processes

The subscription module needs reliable processing for:

1. Trial expiration.
2. Past-due grace-period expiration.
3. Subscription period updates.
4. Reconciliation of pending payments.
5. Failed webhook retries.
6. Subscription status consistency checks.

Use a reliable scheduled execution mechanism supported by the existing deployment environment.

Possible implementations include:

- Supabase scheduled functions.
- Supabase Cron with secure database functions.
- An authenticated scheduled Next.js endpoint supported by the hosting environment.

The selected mechanism must be verified against the actual deployment configuration.

Do not rely on frontend activity to run billing operations.

All scheduled processes must be idempotent.

---

# PART J: TESTING AND ACCEPTANCE CRITERIA

## 39. Functional Tests

### Default plan

- A new business receives Free.
- An existing business is safely assigned Free during migration.
- No automatic payment is initiated.

### Trial

- An authorised owner can activate a trial.
- Trial duration is seven days.
- No payment is collected.
- Repeated activation is rejected.
- Another user cannot activate a trial on the same business.
- Concurrent requests cannot create multiple trials.
- Expiration returns the business to Free.
- Trial expiration does not initiate billing.

### Branch limits

- Free can create only one branch.
- Pro can create additional branches.
- Direct API requests cannot bypass limits.
- Existing multi-branch businesses are preserved during migration.
- Downgrade does not delete branches or records.

### Resource limits

- Free usage is measured correctly.
- Pro entitlements are applied correctly.
- Concurrent operations cannot bypass critical limits.
- Limits are enforced on the server.
- Existing data remains accessible after downgrade.

### Payments

- Checkout initializes successfully.
- The correct NGN amount is used.
- Payment references are unique.
- Invalid payments do not activate Pro.
- Correct payments activate Pro after verification.
- Duplicate webhooks do not duplicate payments.
- Recurring billing events update subscriptions correctly.
- Failed payments follow the grace-period policy.
- Cancellation stops future recurring charges.

### Security

- One business cannot access another business's subscription.
- Staff cannot modify billing settings.
- Unauthenticated requests are rejected.
- Invalid webhook signatures are rejected.
- Secret keys are never exposed to the browser.
- Platform controls are protected by existing platform permissions.

## 40. Acceptance Criteria

The module is ready for production only when:

1. All subscription migrations have been applied successfully.
2. Existing business records are preserved.
3. Free plan provisioning works.
4. Seven-day trials work correctly.
5. One-trial-per-business enforcement is reliable.
6. Branch restrictions work at backend and database level.
7. Usage limits are centrally configured.
8. Paystack payment verification works.
9. Recurring authorisation and renewal have been tested.
10. Webhook processing is secure and idempotent.
11. Downgrades preserve business data.
12. Platform administrators can manage subscriptions.
13. Subscription RLS policies have been tested.
14. Production and test credentials are separated.
15. The application builds successfully.
16. Existing TraderERP modules continue to work.

---

# PART K: IMPLEMENTATION PHASES

## Phase 1: Repository Inspection

Inspect the existing codebase, database schema, authentication, business context, server actions, permissions and deployment configuration.

Deliverable: Repository assessment and integration plan.

## Phase 2: Database Foundation

Create migrations, tables, constraints, indexes, RLS policies, default plans and existing-business backfill.

Deliverable: Working subscription database foundation.

## Phase 3: Subscription Engine

Implement plan retrieval, subscription provisioning, trial activation, trial expiration and entitlement checks.

Deliverable: Working Free and trial management.

## Phase 4: Usage and Access Control

Integrate limits into actual business operations and branch creation.

Deliverable: Reliable Free and Pro enforcement.

## Phase 5: Paystack Integration

Implement checkout, recurring authorisation, payment verification, webhook processing, renewals and cancellation.

Deliverable: Secure subscription payments.

## Phase 6: User Interface

Implement pricing, trial activation, usage indicators, subscription management and payment history.

Deliverable: Complete user subscription experience.

## Phase 7: Platform Administration

Implement subscription analytics, business inspection, manual controls and audit history.

Deliverable: Platform subscription management.

## Phase 8: Testing and Production Rollout

Run test cases, review security, test production payment configuration and safely introduce plan enforcement.

Deliverable: Production-ready subscription module.

---

# PART L: MASTER CODING PROMPT

You are acting as a senior full-stack engineer and software architect working directly inside the existing TraderERP repository.

Your assignment is to implement a complete, secure, production-ready Subscription and Billing Management Module for TraderERP.

## 1. PROJECT CONTEXT

TraderERP is a multi-tenant business management platform built for Nigerian retail, wholesale and branch-based businesses.

Existing functional modules include:

- Sales POS.
- Inventory Control.
- Customer CRM.
- Debt Management.
- Advanced Reporting.
- Branch Management.
- Business Management.
- Platform Administration.

The current architecture is:

- Next.js 16 App Router.
- React Server Components.
- Next.js Server Actions.
- Next.js Route Handlers.
- Supabase PostgreSQL.
- Supabase Auth.
- PostgreSQL Row Level Security.
- Zustand.
- Tailwind CSS v4.
- Vanilla CSS.
- Lucide React.
- Sequential Supabase SQL migrations.

Existing source organisation includes:

- `/src/app/actions`
- `/src/components`
- `/supabase/migrations`

Existing business tables include:

- `businesses`
- `users`
- `branches`
- `user_branches`
- `products`
- `inventory`
- `sales`
- `sale_items`
- `customers`
- `repayments`

The system already has:

- Multi-tenant business isolation.
- Branch-based staff permissions.
- Owner, Admin, Manager and Staff roles.
- Existing database validation.
- Secure sales transaction processing.
- A platform owner dashboard.
- A Super Admin Platform Console.

## 2. NON-NEGOTIABLE INSTRUCTIONS

Before writing code:

1. Inspect the entire relevant project structure.
2. Inspect the existing Supabase database schema and migrations.
3. Inspect authentication and session validation.
4. Inspect business-context resolution.
5. Inspect existing role and permission utilities.
6. Inspect Server Actions.
7. Inspect the branch creation workflow.
8. Inspect the product creation workflow.
9. Inspect the sales transaction procedure.
10. Inspect existing dashboard and platform console components.
11. Inspect deployment and environment configuration.

Do not assume that proposed paths or functions already exist.

Do not duplicate existing functionality.

Do not replace the current authentication system.

Do not migrate to another framework or database.

Do not break existing business workflows.

Do not remove existing functionality.

Do not delete existing user or business data.

Do not introduce unapproved usage limits.

Do not hardcode subscription states or usage values in the frontend.

Do not expose secret keys.

Preserve the existing design system and mobile-first experience.

If a requirement conflicts with an existing implementation, identify the conflict and implement the safest compatible solution. Document any decision that requires product-owner approval.

## 3. CONFIRMED BUSINESS RULES

Implement these exact settings:

FREE PLAN:
- Price: ₦0.
- Permanent.
- One branch maximum.
- Configurable resource limits.
- Essential business management access.

PRO PLAN:
- Price: ₦1,000 per month.
- Monthly billing only.
- Unlimited branches.
- Higher or unlimited configured usage limits.
- Full Pro entitlements.

FREE TRIAL:
- Seven days.
- One trial per business.
- Voluntary activation.
- No payment details collected at activation.
- No automatic charge when the trial ends.
- Trial eligibility enforced in PostgreSQL and server-side logic.

PAYMENT:
- Paystack.
- NGN currency.
- Explicit recurring-payment authorisation during upgrade checkout.
- Server-side verification.
- Secure webhook handling.
- Automatic monthly renewal where provider authorisation permits.

EXISTING USERS:
- Existing users remain on Free until they choose to upgrade.
- Do not silently charge existing users.
- Do not delete or disable existing business records during migration.
- Do not automatically activate trials.

BRANCH RULES:
- Free: One active branch.
- Pro: Unlimited branches.
- Never delete branches or business records on downgrade.

## 4. DATABASE IMPLEMENTATION

Create the necessary timestamped Supabase migrations.

Implement:

- `subscription_plans`
- `business_subscriptions`
- `subscription_payments`
- `subscription_usage`
- `subscription_webhook_events`
- `subscription_audit_logs`

Use UUIDs, appropriate foreign keys, indexes, constraints and timestamps.

Enforce one authoritative current subscription per business.

Guarantee one trial per business using a persistent database-level restriction.

Create safe migration logic to initialise existing businesses on Free.

Seed the Free and Pro plans.

Store resource limits and feature entitlements centrally.

Use appropriate PostgreSQL numeric types for monetary amounts.

Represent NGN consistently.

Ensure the payment amount is ₦1,000, or 100000 kobo when using Paystack's kobo-based amount field.

Do not create duplicate business records.

## 5. SUBSCRIPTION SERVICE

Build reusable server-side subscription services.

Required capabilities:

- Get current business subscription.
- Get plan information.
- Provision Free subscription.
- Activate trial.
- Check trial eligibility.
- Expire trial.
- Check subscription status.
- Check feature entitlement.
- Retrieve usage.
- Check resource limit.
- Upgrade to Pro.
- Cancel Pro.
- Process downgrade.
- Process successful renewal.
- Process failed renewal.
- Reconcile subscription state.

All business operations must use the existing authenticated business context.

Do not accept arbitrary business IDs from the browser without verifying membership and permission.

## 6. ENTITLEMENT AND USAGE ENGINE

Build a central entitlement-checking service.

It must support:

- Branch count.
- Product count.
- Monthly sales count.
- Customer count.
- Other existing resources only where their modules are confirmed in the repository.

The entitlement engine must distinguish:

- Unlimited.
- Configured numeric limit.
- Feature disabled.
- Feature enabled.

Implement checks inside server-side operations.

Where concurrent requests could exceed limits, use database transactions, stored procedures, locks or other suitable atomic enforcement mechanisms.

Do not trust frontend usage counts.

Do not allow users to bypass limits through direct requests.

The product owner has not yet approved final numeric Free limits for products, sales and customers. Store these values in configurable plan settings and do not enforce illustrative values in production until approved.

## 7. BRANCH MANAGEMENT

Integrate branch entitlement checks into the existing branch creation workflow.

Free businesses cannot create a second active branch.

Pro businesses can create unlimited branches.

Preserve existing:

- Branch records.
- Inventory.
- User assignments.
- Sales.
- Branch managers.
- Staff permissions.

When a multi-branch Pro business downgrades, do not delete branches or automatically disable existing records.

Block additional branch creation and display an informative account status message.

Preserve existing branch-level security rules.

## 8. TRIAL SYSTEM

Implement a seven-day Pro trial.

Only an authorised business owner can activate it.

No Paystack checkout should occur when the trial is activated.

No payment details should be collected.

Store the trial start and end timestamps.

Use database-level enforcement to prevent repeated activation.

Trial activation must be atomic.

Create a reliable scheduled expiration mechanism.

When the trial ends:

- Restore Free entitlements.
- Preserve all business data.
- Record the event.
- Notify the business owner through the existing notification mechanism where available.

## 9. PAYSTACK INTEGRATION

Implement Paystack using secure server-side operations.

Required functionality:

- Paystack customer handling.
- Checkout initialization.
- Monthly plan association.
- Unique transaction references.
- Payment verification.
- Recurring subscription authorisation.
- Webhook signature verification.
- Webhook event storage.
- Idempotent event processing.
- Successful renewal processing.
- Failed payment handling.
- Cancellation synchronization.

Use official, current Paystack API documentation to verify endpoints, request parameters, event names and recurring subscription requirements before implementation.

Do not invent API endpoints or webhook event names.

Do not assume that a successful initial transaction automatically establishes recurring billing.

The checkout must clearly explain that Pro costs ₦1,000 monthly and that recurring billing will occur only after explicit authorisation.

Never expose Paystack secret keys.

Do not activate Pro from a browser redirect alone.

Only verified payments activate paid access.

## 10. WEBHOOK ROUTE

Implement the appropriate Next.js Route Handler for Paystack webhooks.

The webhook must:

- Read the raw request body.
- Validate the signature.
- Reject unauthorised requests.
- Record incoming events.
- Use idempotency controls.
- Verify transaction data where appropriate.
- Update subscription and payment records atomically.
- Log errors.
- Support safe retries.

Prevent duplicate payments and duplicate billing-period extensions.

## 11. CANCELLATION AND FAILED PAYMENTS

Implement:

- Cancellation at period end.
- Provider-side recurring cancellation where required.
- Three-day configurable grace period for failed renewal payments.
- `past_due` status.
- Payment retry handling.
- Downgrade after grace expiration.
- Data preservation.

Do not confuse cancellation with failed payment.

Do not leave a Paystack recurring subscription active after the corresponding local subscription is considered permanently cancelled.

## 12. FRONTEND DEVELOPMENT

Build a complete subscription experience consistent with TraderERP's current interface.

Implement:

1. Pricing page or pricing section.
2. Free and Pro plan cards.
3. Seven-day trial activation.
4. Trial countdown banner.
5. Usage indicators.
6. Upgrade modal.
7. Paystack checkout initiation.
8. Payment processing screen.
9. Payment success and failure screens.
10. Subscription overview.
11. Billing history.
12. Cancellation flow.

Use existing components and design tokens where possible.

The interface must work on mobile, tablet and desktop.

Use Lucide React icons consistently.

Do not introduce an unrelated visual style.

## 13. PLATFORM ADMINISTRATION

Extend the existing Super Admin Platform Console.

Implement subscription management with:

- Total Free businesses.
- Active Pro businesses.
- Trial businesses.
- Past-due businesses.
- Expired subscriptions.
- Cancelled subscriptions.
- Verified recurring revenue.
- Failed payments.
- Searchable business subscription directory.
- Subscription detail view.
- Payment history.
- Trial history.
- Webhook processing status.
- Audit trail.
- Configurable plan entitlements.

Provide authorised administrative controls.

Every manual override must require a reason and produce an audit record.

Do not create another platform administrator authentication system.

## 14. SECURITY

Preserve the existing multi-tenant isolation.

Create RLS policies for all subscription tables.

Ensure business users can only access records belonging to their authorised workspace.

Only authorised business owners or billing administrators can change subscriptions.

Staff must not be able to modify billing settings.

Use server-side verification for every subscription mutation.

Reuse existing account-status validation and write-access validation.

Keep service-role credentials server-only.

Never trust client-supplied:

- Business IDs.
- Subscription status.
- Plan IDs.
- Payment status.
- Usage counts.
- Payment amounts.
- Entitlements.

Validate all relevant values server-side.

## 15. BACKGROUND PROCESSING

Implement reliable scheduled processing for:

- Trial expiration.
- Grace-period expiration.
- Subscription status reconciliation.
- Pending payment reconciliation.
- Webhook retry handling.

Use an execution mechanism compatible with the actual TraderERP hosting environment.

Make all background operations idempotent.

Document the scheduling and deployment requirements.

## 16. TESTING

Write appropriate tests for:

- Free plan provisioning.
- Existing business migration.
- Trial activation.
- Duplicate trial rejection.
- Concurrent trial activation.
- Trial expiration.
- Branch limits.
- Usage limits.
- Pro entitlement.
- Payment initialization.
- Payment verification.
- Invalid payment rejection.
- Webhook signature validation.
- Duplicate webhook rejection.
- Renewal.
- Failed renewal.
- Cancellation.
- Downgrade.
- RLS isolation.
- Role restrictions.
- Data preservation.

Run existing tests where available.

Run linting, type checking and production build validation.

Fix regressions introduced by the subscription implementation.

## 17. IMPLEMENTATION WORKFLOW

Work in the following sequence:

PHASE 1: Repository inspection and technical integration report.

PHASE 2: Database migrations, RLS, constraints and Free plan provisioning.

PHASE 3: Subscription service and trial engine.

PHASE 4: Usage limits and backend entitlement enforcement.

PHASE 5: Paystack checkout, verification, recurring billing and webhooks.

PHASE 6: User-facing subscription interface.

PHASE 7: Platform administration and analytics.

PHASE 8: Testing, security review and deployment documentation.

Do not skip repository inspection.

Do not build all phases in one uncontrolled code change.

After each phase:

- Explain what was implemented.
- List the files created or modified.
- Report database migrations.
- Report tests performed.
- Report unresolved issues.
- Identify any configuration needed from the product owner.
- Confirm whether the phase is ready for the next stage.

## 18. ENVIRONMENT VARIABLES

Prepare environment configuration for:

```env
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

Use the project's existing Supabase configuration.

Do not replace existing environment variables.

Add clear instructions for obtaining and configuring Paystack credentials.

Separate test and production credentials.

## 19. FINAL DELIVERABLES

At completion, provide:

1. Technical implementation summary.
2. Database schema and migrations.
3. Subscription services.
4. Entitlement engine.
5. Trial management.
6. Paystack integration.
7. Webhook implementation.
8. Frontend subscription pages.
9. Platform administration interface.
10. Security and RLS policies.
11. Background job configuration.
12. Testing report.
13. Deployment instructions.
14. Environment variable guide.
15. Outstanding configuration requirements.

## 20. FINAL QUALITY REQUIREMENT

TraderERP is already an operational multi-tenant business management application.

Your job is to extend it safely, not redesign or rebuild it.

The subscription system must feel like a native part of TraderERP.

Existing businesses must continue operating.

Existing sales, inventory, customers, debts, branches and employee records must remain intact.

All billing and access decisions must be secure, auditable and server-side.

Implement the subscription system to production-quality standards, with particular attention to multi-tenant isolation, payment correctness, recurring billing and data preservation.

Begin with repository inspection and the Phase 1 technical integration report. Do not start destructive database changes or production payment activation before the implementation plan and migration strategy have been reviewed.
