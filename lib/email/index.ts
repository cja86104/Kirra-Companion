/**
 * EMAIL SERVICE - KIRRA COMPANION
 * 
 * Centralized email sending utility.
 * 
 * SETUP: Add one of these to your project:
 * - Resend: npm install resend
 * - SendGrid: npm install @sendgrid/mail
 * 
 * Then set the appropriate environment variables and uncomment the provider.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Kirra <noreply@kirra.app>';
const APP_NAME = 'Kirra';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@kirra.app';

/**
 * Send an email. Currently logs to console.
 * Uncomment the Resend section after: npm install resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, from = DEFAULT_FROM } = options;

  // Uncomment after: npm install resend && add RESEND_API_KEY to .env
  //
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // try {
  //   const { data, error } = await resend.emails.send({ from, to, subject, html, text });
  //   if (error) return { success: false, error: error.message };
  //   return { success: true, messageId: data?.id };
  // } catch (err) {
  //   return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  // }

  console.log('=== EMAIL WOULD BE SENT ===');
  console.log('To:', to);
  console.log('From:', from);
  console.log('Subject:', subject);
  console.log('===========================');

  return { success: true, messageId: `dev-${Date.now()}` };
}

/**
 * Payment failed notification email template
 */
export function paymentFailedEmail(params: {
  userName: string;
  amount: number;
  currency: string;
  invoiceId: string;
}): Omit<EmailOptions, 'to'> {
  const { userName, amount, currency, invoiceId } = params;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const subject = `Action Required: Payment Failed for ${APP_NAME}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #7c3aed;">${APP_NAME}</h1>
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin-top: 0;">Payment Failed</h2>
    <p>Hi ${userName},</p>
    <p>We were unable to process your payment of <strong>${formattedAmount}</strong>.</p>
  </div>
  <p>Please update your payment method in your account settings.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" 
     style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
    Update Payment Method
  </a>
  <p style="color: #666; font-size: 14px; margin-top: 20px;">
    Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
  <p style="color: #9ca3af; font-size: 12px;">Invoice ID: ${invoiceId}</p>
</body>
</html>`.trim();

  const text = `Payment Failed - ${APP_NAME}

Hi ${userName},

We were unable to process your payment of ${formattedAmount}.

Please update your payment method: ${process.env.NEXT_PUBLIC_APP_URL}/settings/billing

Need help? Contact ${SUPPORT_EMAIL}

Invoice ID: ${invoiceId}`;

  return { subject, html, text };
}
