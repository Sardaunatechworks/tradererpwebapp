import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1. PRIVACY CONSENT VALIDATION & ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

test('Consent type and policy version validation', () => {
  const allowedConsentTypes = ['terms_and_privacy', 'marketing_emails', 'analytics_cookies'];

  function validateConsentRecord(consent) {
    if (!consent.consent_type || !allowedConsentTypes.includes(consent.consent_type)) {
      throw new Error(`Invalid consent type: ${consent.consent_type}`);
    }
    if (!consent.policy_version || typeof consent.policy_version !== 'string') {
      throw new Error('Policy version must be specified');
    }
    if (typeof consent.granted !== 'boolean') {
      throw new Error('Consent granted status must be a boolean');
    }
    return true;
  }

  // Valid mandatory consent
  assert.equal(
    validateConsentRecord({
      consent_type: 'terms_and_privacy',
      policy_version: 'v1.0',
      granted: true,
    }),
    true
  );

  // Valid optional marketing consent
  assert.equal(
    validateConsentRecord({
      consent_type: 'marketing_emails',
      policy_version: 'v1.0',
      granted: false,
    }),
    true
  );

  // Invalid consent type
  assert.throws(
    () =>
      validateConsentRecord({
        consent_type: 'unauthorized_tracking',
        policy_version: 'v1.0',
        granted: true,
      }),
    /Invalid consent type/
  );
});

test('Mandatory Terms consent check during signup', () => {
  function validateSignupConsent(formData) {
    const termsConsent = formData.get('termsConsent');
    if (termsConsent !== 'on' && termsConsent !== 'true') {
      return { error: 'You must review and agree to the Terms of Service and Privacy Policy to create an account.' };
    }
    const marketingConsent = formData.get('marketingConsent') === 'on' || formData.get('marketingConsent') === 'true';
    return { success: true, termsConsent: true, marketingConsent };
  }

  // Case 1: Terms agreed, marketing left unchecked
  const validMap = new Map([['termsConsent', 'on']]);
  const res1 = validateSignupConsent(validMap);
  assert.equal(res1.success, true);
  assert.equal(res1.termsConsent, true);
  assert.equal(res1.marketingConsent, false); // Marketing is strictly unselected

  // Case 2: Terms agreed, marketing checked
  const optInMap = new Map([
    ['termsConsent', 'on'],
    ['marketingConsent', 'on'],
  ]);
  const res2 = validateSignupConsent(optInMap);
  assert.equal(res2.success, true);
  assert.equal(res2.termsConsent, true);
  assert.equal(res2.marketingConsent, true);

  // Case 3: Terms not checked
  const invalidMap = new Map([['marketingConsent', 'on']]);
  const res3 = validateSignupConsent(invalidMap);
  assert.equal(res3.success, undefined);
  assert.match(res3.error, /Terms of Service/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ACCOUNT DELETION WORKFLOW & SHARED BUSINESS DATA PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────

test('Account Deletion Request Status Transitions', () => {
  const allowedStatuses = ['pending', 'processing', 'completed', 'cancelled', 'rejected'];

  function transitionDeletionStatus(currentStatus, nextStatus, isUser) {
    if (!allowedStatuses.includes(nextStatus)) {
      throw new Error(`Invalid status: ${nextStatus}`);
    }

    // Ordinary users can only cancel a pending request
    if (isUser) {
      if (currentStatus === 'pending' && nextStatus === 'cancelled') {
        return nextStatus;
      }
      throw new Error('Users can only cancel their own pending requests');
    }

    // Administrators/reviewers can process, complete, or reject
    return nextStatus;
  }

  // User cancels pending request
  assert.equal(transitionDeletionStatus('pending', 'cancelled', true), 'cancelled');

  // User cannot self-approve completion
  assert.throws(() => transitionDeletionStatus('pending', 'completed', true), /Users can only cancel/);

  // Admin completes request
  assert.equal(transitionDeletionStatus('processing', 'completed', false), 'completed');
});

test('Shared business transaction preservation rule', () => {
  // Simulates verification that deleting a user profile does NOT cascade-delete business sales
  const businessRecords = {
    businessId: 'biz-100',
    sales: [
      { id: 'sale-1', sold_by: 'user-to-delete', total: 15000 },
      { id: 'sale-2', sold_by: 'other-user', total: 22000 },
    ],
    expenses: [{ id: 'exp-1', recorded_by: 'user-to-delete', amount: 5000 }],
  };

  function processUserAccountClosure(userProfile, businessData) {
    // Anonymize user profile without deleting shared ledger
    const anonymizedUser = {
      ...userProfile,
      name: '[Former Staff Member]',
      email: `anonymized_${userProfile.id}@archived.local`,
      phone: null,
      status: 'inactive',
    };

    // Sales remain completely preserved under the business
    const preservedSalesCount = businessData.sales.length;
    const preservedExpensesCount = businessData.expenses.length;

    return {
      anonymizedUser,
      preservedSalesCount,
      preservedExpensesCount,
    };
  }

  const user = { id: 'user-to-delete', name: 'John Doe', email: 'john@store.ng', phone: '08011112222' };
  const outcome = processUserAccountClosure(user, businessRecords);

  assert.equal(outcome.anonymizedUser.name, '[Former Staff Member]');
  assert.equal(outcome.anonymizedUser.phone, null);
  assert.equal(outcome.preservedSalesCount, 2);
  assert.equal(outcome.preservedExpensesCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERSONAL DATA EXPORT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

test('Personal Data Export contains required privacy and transparency elements', () => {
  function buildPersonalExport(user, business, consents) {
    return {
      exportTimestamp: new Date().toISOString(),
      platform: 'TraderERP Nigeria',
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
      },
      businessMembership: business
        ? { businessId: business.id, businessName: business.name }
        : null,
      consents,
      dataControlNotice:
        'This file contains a copy of your personal account information and registered consent history.',
    };
  }

  const exportData = buildPersonalExport(
    { id: 'u-1', name: 'Alhaji Musa', email: 'musa@trade.ng', phone: '08099998888', status: 'active' },
    { id: 'b-1', name: 'Musa Provisions' },
    [{ consent_type: 'terms_and_privacy', granted: true, policy_version: 'v1.0' }]
  );

  assert.equal(exportData.platform, 'TraderERP Nigeria');
  assert.equal(exportData.account.email, 'musa@trade.ng');
  assert.equal(exportData.businessMembership.businessName, 'Musa Provisions');
  assert.equal(exportData.consents.length, 1);
  assert.match(exportData.dataControlNotice, /personal account information/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GUIDED TOUR STEP ADAPTATION & PROGRESSION
// ─────────────────────────────────────────────────────────────────────────────

test('Guided tour adapts steps based on user role', () => {
  const allSteps = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sales', label: 'Sales' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'credit', label: 'Credit' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings', roleRequired: 'admin_or_owner' },
  ];

  function getStepsForRole(role) {
    if (role === 'staff') {
      return allSteps.filter((s) => s.roleRequired !== 'admin_or_owner');
    }
    return allSteps;
  }

  const ownerSteps = getStepsForRole('owner');
  assert.equal(ownerSteps.length, 7);
  assert.equal(ownerSteps.some((s) => s.id === 'settings'), true);

  const staffSteps = getStepsForRole('staff');
  assert.equal(staffSteps.length, 6);
  assert.equal(staffSteps.some((s) => s.id === 'settings'), false);
});
