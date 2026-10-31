/**
 * Evasale transactional email via Resend.
 *
 * If RESEND_API_KEY env var is set, sends real emails. If not, logs
 * to console (dev/test compatibility).
 *
 * Setup:
 * 1. Sign up at https://resend.com (free)
 * 2. API Keys → create
 * 3. Add and verify the sending domain in Resend.
 * 4. Set RESEND_API_KEY and RESEND_FROM_EMAIL in the deployment environment.
 */

import { brand } from '@/lib/brand';

const API_KEY = process.env.RESEND_API_KEY;
const FROM =
  process.env.RESEND_FROM_EMAIL ||
  `${brand.email.fromName} <${brand.email.replyTo}>`;
const REPLY_TO = brand.email.replyTo;
const SITE = brand.siteUrl;

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Wraps subject/body in a styled HTML email shell.
 * Logo URL is from /public/brand/ — we use an inline PNG so it works without
 * the recipient allowing CDN images.
 */
function emailTemplate(title: string, body: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1f26">
     <div style="padding:20px 16px;background:#000000;display:flex;align-items:center;justify-content:center">
      <img src="${brand.logo}" alt="${brand.name}" height="36" style="height:36px;width:auto" />
    </div>
    <h1 style="font-size:22px;margin:24px 0 12px;color:#1a1f26">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:16px">
      ${brand.copyrightLine.replace('{year}', String(new Date().getFullYear()))}<br />
      ${brand.contact.address.full} — ${brand.contact.email}
    </p>
  </div>`;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[email] RESEND_API_KEY is not set — email not sent:', payload.subject);
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo ?? REPLY_TO,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('[email] send failed', res.status, detail, 'to=', payload.to, 'from=', FROM);
    return { ok: false, error: `Resend ${res.status}` };
  }
  return { ok: true };
}

/**
 * Order confirmation. Subject from brand config.
 */
export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  totalRand: string;
  items: string; // pre-rendered HTML of items
}) {
  await sendEmail({
    to: params.to,
    subject: `${brand.email.orderConfirmationSubject} — ${params.orderNumber}`,
    html: emailTemplate(
      `Order ${params.orderNumber} confirmed`,
      `<p style="color:#566c7d;line-height:1.6">Thanks for your order. Here's a summary:</p>
       <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0">
         ${params.items}
         <p style="font-weight:600;margin-top:12px;color:#C72E28">Total: ${params.totalRand}</p>
       </div>
       <p style="color:#566c7d">Track your order anytime at <a href="${SITE}/account/orders" style="color:#C72E28">your account</a>.</p>`
    ),
  });
}

/**
 * Payment received — the first notification after the customer pays.
 *
 * Sent the moment the ITN verifies the payment, so the customer knows the
 * order is real and has a receipt link they can use without an account.
 */
export async function sendOrderReceived(params: {
  to: string;
  orderNumber: string;
  totalRand: string;
  items: string;
  receiptUrl: string;
}) {
  const result = await sendEmail({
    to: params.to,
    subject: `${brand.email.orderConfirmationSubject} — ${params.orderNumber}`,
    html: emailTemplate(
      `Order ${params.orderNumber} confirmed`,
      `<p style="color:#566c7d;line-height:1.6">Thanks for your order — we have received your payment and your order is confirmed.</p>
       <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0">
         ${params.items}
         <p style="font-weight:600;margin-top:12px;color:#C72E28">Total: ${params.totalRand}</p>
       </div>
       <p style="color:#566c7d;line-height:1.6"><strong>What happens next</strong><br />
       1. We email you again once your order is packed.<br />
       2. Your parcel leaves with The Courier Guy (2–5 working days).<br />
       3. Your tracking number appears on your order page.</p>
       <p style="margin:20px 0">
         <a href="${params.receiptUrl}" style="display:inline-block;padding:12px 20px;background:#C72E28;color:white;border-radius:6px;text-decoration:none;font-weight:600">
           View your order &amp; track it
         </a>
       </p>
       <p style="color:#566c7d;line-height:1.6">This link also works without an account — keep it for your records.</p>`
    ),
  });
  return result;
}

/**
 * "We are processing your order" — sent when fulfilment starts.
 */
export async function sendOrderProcessing(params: {
  to: string;
  orderNumber: string;
  receiptUrl: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `We are preparing your order — ${params.orderNumber}`,
    html: emailTemplate(
      `We are preparing order ${params.orderNumber}`,
      `<p style="color:#566c7d;line-height:1.6">We have received your order and it is now being picked, packed and checked in our warehouse.</p>
       <p style="color:#566c7d;line-height:1.6">We will email you again as soon as it is on its way with The Courier Guy.</p>
       <p style="margin:20px 0">
         <a href="${params.receiptUrl}" style="display:inline-block;padding:12px 20px;background:#C72E28;color:white;border-radius:6px;text-decoration:none;font-weight:600">
           Track your order
         </a>
       </p>`
    ),
  });
}

/**
 * Delivered.
 */
export async function sendOrderDelivered(params: { to: string; orderNumber: string; receiptUrl: string }) {
  return sendEmail({
    to: params.to,
    subject: `Your order has been delivered — ${params.orderNumber}`,
    html: emailTemplate(
      `Order ${params.orderNumber} delivered`,
      `<p style="color:#566c7d;line-height:1.6">Your parcel has been delivered. We hope you love it.</p>
       <p style="color:#566c7d;line-height:1.6">Need anything else? WhatsApp us on ${brand.contact.phone}.</p>
       <p style="margin:20px 0">
         <a href="${params.receiptUrl}" style="display:inline-block;padding:12px 20px;background:#C72E28;color:white;border-radius:6px;text-decoration:none;font-weight:600">
           View your order
         </a>
       </p>`
    ),
  });
}

/**
 * Order shipped — includes tracking number + courier name.
 */
export async function sendOrderShipped(params: {
  to: string;
  orderNumber: string;
  tracking: string | undefined;
}) {
  const trackingHtml = params.tracking
    ? `<p style="color:#566c7d;line-height:1.6"><strong>Tracking number:</strong> ${params.tracking}</p>`
    : '<p style="color:#566c7d;line-height:1.6">Tracking information will be available shortly.</p>';

  await sendEmail({
    to: params.to,
    subject: `${brand.email.orderShippedSubject} — ${params.orderNumber}`,
    html: emailTemplate(
      `Your order ${params.orderNumber} is on its way`,
      `<p style="color:#566c7d;line-height:1.6">Great news — your order has been shipped and is heading your way.</p>
       <p style="color:#566c7d;line-height:1.6">Need help? Call ${brand.contact.phone} or WhatsApp ${brand.contact.whatsapp}.</p>
       ${trackingHtml}
       <p style="color:#566c7d">Track at <a href="${SITE}/account/orders" style="color:#C72E28">your account</a>.</p>`
    ),
  });
}

/**
 * Return status update.
 */
export async function sendReturnUpdate(params: { to: string; orderNumber: string; status: string }) {
  const statusMap: Record<string, { title: string; body: string }> = {
    approved: { title: 'Return approved', body: 'Your return has been approved. Refund will arrive within 5–7 business days.' },
    refunded: { title: 'Refund processed', body: 'Your refund has been processed and should appear within 5–7 business days.' },
    rejected: { title: 'Return update', body: 'Your return was not approved. Please contact us for help.' },
    received: { title: 'Return received', body: 'We have received your returned item.' },
  };
  const s = statusMap[params.status] || { title: 'Return updated', body: `Your return for order <strong>${params.orderNumber}</strong> has been updated to: ${params.status}.` };

  await sendEmail({
    to: params.to,
    subject: `${s.title} — ${params.orderNumber}`,
    html: emailTemplate(s.title, `<p style="color:#566c7d;line-height:1.6">${s.body}</p>`)
  });
}

/**
 * Newsletter welcome.
 */
export async function sendNewsletterWelcome(params: { to: string }): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: brand.email.newsletterWelcomeSubject,
    html: `
      <div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif">
        <h1 style="color:#1a1f26;font-size:22px;margin:0 0 12px">Welcome to ${brand.name} 👋</h1>
        <p style="color:#566c7d;line-height:1.6">
          Thanks for subscribing. Use code <strong style="color:#C72E28">${brand.short.toUpperCase()}10</strong> for 10% off your first order.
        </p>
        <p style="margin:24px 0">
          <a href="${SITE}/new"
             style="display:inline-block;padding:10px 16px;background:#C72E28;color:white;border-radius:6px;text-decoration:none;font-weight:500">
            Shop new arrivals
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px">Reply to this email to unsubscribe.</p>
      </div>
    `,
  });
}
