import { Mailhive } from '@mailhive/send';
import fs from 'fs';
import path from 'path';

/**
 * Mailhive Africa Node.js SDK Email Integration
 * Package: @mailhive/send
 * Documentation: https://mailhive.africa/docs/sdks/node
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getMailhiveApiKey(): string | null {
  if (process.env.MAILHIVE_API_KEY) {
    return process.env.MAILHIVE_API_KEY.trim();
  }

  // Fallback: Read directly from .env.local or .env if process.env was not yet reloaded by dev server
  try {
    const cwd = process.cwd();
    const envPaths = [
      path.join(/* turbopackIgnore: true */ cwd, '.env.local'),
      path.join(/* turbopackIgnore: true */ cwd, '.env'),
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^MAILHIVE_API_KEY\s*=\s*(.+)$/m);
        if (match && match[1]) {
          const key = match[1].trim().replace(/^['"]|['"]$/g, '');
          process.env.MAILHIVE_API_KEY = key;
          return key;
        }
      }
    }
  } catch (err) {
    console.warn('[Mailhive] Could not read env fallback from disk:', err);
  }

  return null;
}

function getMailhiveDefaultFrom(): string {
  if (process.env.MAILHIVE_DEFAULT_FROM) {
    return process.env.MAILHIVE_DEFAULT_FROM.trim();
  }

  try {
    const cwd = process.cwd();
    const envPaths = [
      path.join(/* turbopackIgnore: true */ cwd, '.env.local'),
      path.join(/* turbopackIgnore: true */ cwd, '.env'),
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^MAILHIVE_DEFAULT_FROM\s*=\s*(.+)$/m);
        if (match && match[1]) {
          const from = match[1].trim().replace(/^['"]|['"]$/g, '');
          process.env.MAILHIVE_DEFAULT_FROM = from;
          return from;
        }
      }
    }
  } catch {
    // ignore
  }

  return 'TraderERP <hello@smarttradererp.com.ng>';
}

/**
 * Returns a Mailhive client instance if MAILHIVE_API_KEY is configured.
 */
export function getMailhiveClient(): Mailhive | null {
  const apiKey = getMailhiveApiKey();
  if (!apiKey) return null;
  return new Mailhive(apiKey);
}

/**
 * Dispatches an email using the official Mailhive Africa Node.js SDK.
 */
export async function sendMailhiveEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
}: SendEmailOptions): Promise<SendEmailResult> {
  const defaultSender = getMailhiveDefaultFrom();
  const senderEmail = from || defaultSender;

  const client = getMailhiveClient();

  if (!client) {
    const errorMsg = 'MAILHIVE_API_KEY is not loaded in server environment. Please restart your dev server (npm run dev) to reload .env.local.';
    console.error(`[Mailhive SDK] ${errorMsg}`, { to, subject, from: senderEmail });
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    const res = await client.emails.send({
      from: senderEmail,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      reply_to: replyTo || undefined,
    });

    return {
      success: true,
      messageId: res.id,
    };
  } catch (err: any) {
    console.error('[Mailhive SDK Error]', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email via Mailhive SDK',
    };
  }
}

/**
 * Sends a professionally styled Password Reset email via the Mailhive Node.js SDK.
 */
export async function sendPasswordResetEmailViaMailhive({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  const subject = 'Reset your TraderERP Password';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                Trader<span style="color: #2563eb;">ERP</span>
              </div>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
                Simple Business Management for Traders
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your account associated with <strong>${to}</strong>.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                  Reset My Password
                </a>
              </div>

              <p style="margin: 24px 0 12px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                This link will expire soon. If the button above doesn't work, copy and paste this URL into your browser:
              </p>
              <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 11px; color: #334155; line-height: 1.4;">
                <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
              </div>

              <!-- Security notice -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                If you did not request a password reset, you can safely ignore this email. Your password will not change until you access the link above.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              © ${new Date().getFullYear()} TraderERP • Developed by Sardauna Tech Lab Ltd
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendMailhiveEmail({
    to,
    subject,
    html,
    text: `Reset your TraderERP password by visiting the following link: ${resetUrl}`,
  });
}
