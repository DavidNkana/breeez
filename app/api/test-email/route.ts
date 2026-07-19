import { NextResponse } from 'next/server';

/**
 * Test endpoint — POST /api/test-email
 * Sends a test email via Resend to verify the integration is working.
 * Body: { "to": "email@example.com" }
 */
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Breeez <orders@breeez.app>';

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'RESEND_API_KEY env var not set on server'
    }, { status: 500 });
  }

  let to = '';
  try {
    const body = await req.json();
    to = body.to;
  } catch {}

  if (!to) {
    return NextResponse.json({
      ok: false,
      error: 'Missing "to" field in request body'
    }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: 'Breeez — Resend test',
        html: `
<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1f26">
  <h2 style="color:#1a1f26">Resend integration test ✅</h2>
  <p style="color:#566c7d">This email confirms that Resend is sending correctly from <strong>${fromEmail}</strong>.</p>
  <p style="color:#566c7d;line-height:1.6">If you got this, transactional emails (order confirmations, shipping, returns) will all work.</p>
  <hr style="border:0;border-top:1px solid #e6eaed;margin:24px 0">
  <p style="color:#788a98;font-size:12px">Sent via Resend API from Breeez dashboard test endpoint.</p>
</body></html>`
      })
    });

    const status = res.status;
    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      ok: res.ok,
      status,
      resendId: data.id,
      error: data.message || null,
      from: fromEmail,
      to
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Network error calling Resend'
    }, { status: 500 });
  }
}