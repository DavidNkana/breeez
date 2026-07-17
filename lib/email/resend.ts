/**
 * Breeez transactional email via Resend.
 *
 * If RESEND_API_KEY env var is set, sends real emails. If not set, logs
 * the email to console and returns silently (dev/test compatibility).
 *
 * Rate limit: Resend free tier = 100 emails/day, 3,000/month.
 *
 * Setup for Chris:
 * 1. Go to https://resend.com → sign up (free)
 * 2. Dashboard → API Keys → create key
 * 3. Add domain `breeez.app` (or your own) and verify it
 * 4. Add to Vercel env: RESEND_API_KEY=re_xxxxxx, RESEND_FROM_EMAIL=orders@breeez.app
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'Breeez <orders@breeez.app>';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  if (!API_KEY) {
    console.log('[email] RESEND_API_KEY not set — skipped:', payload.subject, '→', payload.to);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      console.error('[email] Resend error:', err);
    } else {
      console.log('[email] Sent:', payload.subject, '→', payload.to);
    }
  } catch (err) {
    console.error('[email] Network error:', err);
  }
}

function emailTemplate(title: string, body: string, footer?: string) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1f26">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:24px;font-weight:700;background:#1a1f26;color:#fff;padding:6px 12px;border-radius:6px">B</span>
    <span style="font-size:20px;font-weight:600;margin-left:8px;color:#1a1f26">Breeez</span>
  </div>
  <h2 style="color:#1a1f26;margin-bottom:12px">${title}</h2>
  ${body}
  ${footer ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e6eaed;color:#788a98;font-size:13px">${footer}</div>` : ''}
  <p style="margin-top:24px;color:#788a98;font-size:12px">Breeez — Shop SA, all in one place. Prices in ZAR. POPIA-compliant.</p>
</body></html>`;
}

/** Order confirmation — sent after successful payment */
export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  totalRand: string;
  items: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Order confirmed — ${params.orderNumber}`,
    html: emailTemplate(
      `Thanks for your order!`,
      `<p style="color:#566c7d;line-height:1.6">Your order <strong>${params.orderNumber}</strong> has been confirmed. We'll let you know when it ships.</p>
       <div style="background:#f4f6f7;border-radius:8px;padding:16px;margin:16px 0">
         <p style="font-weight:600;margin:0 0 8px">Order summary</p>
         ${params.items}
         <p style="font-weight:700;margin:12px 0 0;font-size:16px">Total: ${params.totalRand}</p>
       </div>
       <p style="color:#566c7d">Track your order anytime at <a href="https://breeez-lyart.vercel.app/account/orders" style="color:#dc2626">your account</a>.</p>`,
      `7-day returns · Free delivery over R500 · PayFast / Yoco / Ozow`
    )
  });
}

/** Order shipped — sent when admin marks order as shipped */
export async function sendOrderShipped(params: {
  to: string;
  orderNumber: string;
  tracking?: string;
}) {
  const trackingHtml = params.tracking
    ? `<p style="color:#566c7d;line-height:1.6"><strong>Tracking number:</strong> ${params.tracking}</p>`
    : '<p style="color:#566c7d;line-height:1.6">Tracking information will be available shortly.</p>';

  await sendEmail({
    to: params.to,
    subject: `Your order has shipped — ${params.orderNumber}`,
    html: emailTemplate(
      `Your order is on the way!`,
      `<p style="color:#566c7d;line-height:1.6">Good news — order <strong>${params.orderNumber}</strong> has been packed and shipped.</p>
       ${trackingHtml}`,
      `Track your order at <a href="https://breeez-lyart.vercel.app/account/orders" style="color:#dc2626">your account</a>`
    )
  });
}

/** Return status update — sent when admin approves/rejects/refunds */
export async function sendReturnUpdate(params: {
  to: string;
  orderNumber: string;
  status: string; // approved | rejected | refunded
}) {
  const statusMap: Record<string, { title: string; body: string }> = {
    approved: {
      title: 'Return approved',
      body: `Your return request for order <strong>${params.orderNumber}</strong> has been approved. Please ship the item back to us. We'll process your refund once we receive it. Return shipping is at your cost.`
    },
    rejected: {
      title: 'Return request declined',
      body: `Your return request for order <strong>${params.orderNumber}</strong> could not be approved. If you believe this is an error, please contact us.`
    },
    refunded: {
      title: 'Refund processed',
      body: `Your refund for order <strong>${params.orderNumber}</strong> has been processed. The amount will appear in your account within 3-5 business days.`
    }
  };

  const s = statusMap[params.status] || { title: 'Return updated', body: `Your return for order <strong>${params.orderNumber}</strong> has been updated to: ${params.status}.` };

  await sendEmail({
    to: params.to,
    subject: `${s.title} — ${params.orderNumber}`,
    html: emailTemplate(s.title, `<p style="color:#566c7d;line-height:1.6">${s.body}</p>`)
  });
}