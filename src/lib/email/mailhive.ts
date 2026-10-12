/**
 * Mailhive Africa Email Service Integration
 * Provider: Mailhive Africa (https://mailhive.africa)
 * Handles transactional and notification email delivery for TraderERP.
 */

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface MailhiveSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMailhiveEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendEmailParams): Promise<MailhiveSendResponse> {
  const apiKey = process.env.MAILHIVE_API_KEY;
  const defaultSender = process.env.MAILHIVE_DEFAULT_FROM || 'noreply@tradererp.com';
  const senderEmail = from || defaultSender;

  // Development fallback warning if API key isn't provided yet
  if (!apiKey) {
    console.warn(
      '[Mailhive] MAILHIVE_API_KEY is not defined in environment variables. Email logged to console instead:',
      { to, subject, from: senderEmail }
    );
    return {
      success: true,
      messageId: `mock_${Date.now()}`,
    };
  }

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const response = await fetch('https://api.mailhive.africa/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: senderEmail,
        to: recipients,
        subject,
        html: html || undefined,
        text: text || undefined,
        reply_to: replyTo || undefined,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Mailhive API returned status ${response.status}`;
      console.error('[Mailhive Error]', errorMsg);
      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      messageId: data?.id || data?.messageId || 'sent',
    };
  } catch (err: any) {
    console.error('[Mailhive Exception]', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email via Mailhive Africa',
    };
  }
}
