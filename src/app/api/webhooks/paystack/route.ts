import { NextRequest, NextResponse } from 'next/server';
import { processPaystackWebhookEvent } from '@/lib/subscription/billing-service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    const result = await processPaystackWebhookEvent(rawBody, signature);
    return NextResponse.json({ message: result.message }, { status: result.statusCode });
  } catch (err: unknown) {
    console.error('Paystack webhook route error:', err);
    return NextResponse.json(
      { message: 'Webhook handler error.' },
      { status: 500 }
    );
  }
}
