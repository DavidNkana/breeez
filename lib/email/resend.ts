/**
 * Trends Day-to-Day transactional email via Resend.
 *
 * If RESEND_API_KEY env var is set, sends real emails. If not, logs
 * to console (dev/test compatibility).
 *
 * Setup:
 * 1. Sign up at https://resend.com (free)
 * 2. API Keys → create
 * 3. Add domain trendsdaytoday.co.za (or your subdomain) + verify
 * 4. Vercel env: RESEND_API_KEY + RESEND_FROM_EMAIL=orders@trendsdaytoday.co.za
 */

import { brand } from '@/lib/brand';

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || `${brand.email.fromName} <onboarding@resend.dev>`;
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
    <div style="padding:16px 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px">
      <img src="${brand.logo}" alt="${brand.name}" height="36" style="height:36px;width:auto" />
    </div>
    <h1 style="font-size:22px;margin:24px 0 12px;color:#1a1f26">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:16px">
      ${brand.copyrightLine.replace('{year}', String(new Date().getFullYear()))}<br />
      ${brand.contact.address.line1}, ${brand.contact.address.line2} — ${brand.contact.email}
    </p>
  </div>`;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.log('[email:mock]', payload.to, payload.subject);
    return;
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
    // eslint-disable-next-line no-console
    console.error('[resend]', res.status, await res.text().catch(() => ''));
  }
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
