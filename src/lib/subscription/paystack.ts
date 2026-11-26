import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }
  return key;
}

export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signatureHeader) {
    return false;
  }

  const expectedHash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHash, 'utf8');
  const receivedBuf = Buffer.from(signatureHeader.trim(), 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

async function paystackRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {}
): Promise<T> {
  const secretKey = getPaystackSecretKey();
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack API error (${res.status})`);
  }

  return json.data as T;
}

export interface PaystackCustomerData {
  id: number;
  customer_code: string;
  email: string;
}

export async function createOrFetchPaystackCustomer(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  businessId: string;
}): Promise<PaystackCustomerData> {
  return paystackRequest<PaystackCustomerData>('/customer', {
    method: 'POST',
    body: {
      email: params.email,
      first_name: params.firstName || 'TraderERP',
      last_name: params.lastName || 'Owner',
      metadata: {
        business_id: params.businessId,
      },
    },
  });
}

export interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializePaystackTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  planCode?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeData> {
  const payload: Record<string, unknown> = {
    email: params.email,
    amount: Math.round(params.amountKobo),
    currency: 'NGN',
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata || {},
  };

  if (params.planCode) {
    payload.plan = params.planCode;
  }

  return paystackRequest<PaystackInitializeData>('/transaction/initialize', {
    method: 'POST',
    body: payload,
  });
}

export interface PaystackVerifyData {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  gateway_response: string | null;
  customer?: {
    id: number;
    customer_code: string;
    email: string;
  };
  authorization?: {
    authorization_code: string;
    reusable: boolean;
    channel: string;
    last4?: string;
    brand?: string;
  };
  plan_object?: {
    plan_code?: string;
  };
  metadata?: Record<string, unknown>;
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyData> {
  return paystackRequest<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export async function fetchPaystackSubscription(codeOrId: string): Promise<{
  subscription_code: string;
  email_token: string;
  status: string;
  next_payment_date: string | null;
}> {
  return paystackRequest(`/subscription/${encodeURIComponent(codeOrId)}`);
}

export async function disablePaystackSubscription(params: {
  code: string;
  token: string;
}): Promise<void> {
  await paystackRequest('/subscription/disable', {
    method: 'POST',
    body: {
      code: params.code,
      token: params.token,
    },
  });
}

