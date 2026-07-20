import { NextResponse } from 'next/server';

async function handleSend(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Trends Day-to-Day <onboarding@resend.dev>';

  if (!apiKey) {
    return {
      ok: false,
      error: 'RESEND_API_KEY env var not set on server',
      status: 500,
      from: fromEmail
    };
  }

  if (!to) {
    return {
      ok: false,
      error: 'Missing "to" — use ?to=email@example.com or POST { "to": "..." }',
      status: 400,
      from: fromEmail
    };
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
        subject: 'Trends Day-to-Day — Resend test',
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2>Resend test ✅</h2><p>This email confirms that Resend is sending correctly from <strong>${fromEmail}</strong>.</p><p style="color:#566c7d">If you got this, transactional emails will work.</p></body></html>`
      })
    });

    const status = res.status;
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status,
      resendId: data.id,
      error: data.message || null,
      from: fromEmail,
      to
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error', status: 500, from: fromEmail };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const to = url.searchParams.get('to') || '';

  // If browser requests with Accept: text/html, return HTML page
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return handleHtml(to);
  }

  // Otherwise JSON
  const result = await handleSend(to);
  return NextResponse.json(result, { status: result.status });
}

export async function POST(req: Request) {
  let to = '';
  try {
    const body = await req.json();
    to = body.to;
  } catch {}
  const result = await handleSend(to);
  return NextResponse.json(result, { status: result.status });
}

async function handleHtml(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Trends Day-to-Day <onboarding@resend.dev>';

  if (!apiKey) {
    return new Response(htmlPage('Missing env var', `
      <h2 style="color:#dc2626">RESEND_API_KEY env var not set</h2>
      <p>Add <code>RESEND_API_KEY</code> to your Vercel project environment variables, then redeploy.</p>
    `), { status: 500, headers: { 'Content-Type': 'text/html' } });
  }

  if (!to) {
    return new Response(htmlPage('Enter email', `
      <h2>Trends Day-to-Day — Resend test</h2>
      <p>Enter your email in the URL: <code>/api/test-email?to=YOUR_EMAIL</code></p>
      <form method="get" action="/api/test-email" style="margin-top:16px">
        <label>Your email: <input name="to" type="email" placeholder="you@example.com" required style="padding:6px;border:1px solid #ccc;border-radius:4px;margin:0 8px"></label>
        <button type="submit" style="padding:6px 12px;background:#1a1f26;color:#fff;border:none;border-radius:4px;cursor:pointer">Send test email</button>
      </form>
    `), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const result = await handleSend(to);

  if (result.ok) {
    return new Response(htmlPage('Test sent ✅', `
      <h2 style="color:#16a34a">Email sent!</h2>
      <p>Check <strong>${escape(to)}</strong> inbox (and spam folder).</p>
      <p>The email was sent <strong>from</strong> <code>${escape(result.from || fromEmail)}</code>.</p>
      <p>Resend message ID: <code>${escape(result.resendId || '')}</code></p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e6eaed">
      <p style="color:#788a98">If you don't see it, check spam, or verify your sender domain in <a href="https://resend.com/domains">Resend Domains</a>.</p>
      <p><a href="/api/test-email">Send another</a></p>
    `), { status: 200, headers: { 'Content-Type': 'text/html' } });
  } else {
    return new Response(htmlPage('Test failed', `
      <h2 style="color:#dc2626">Failed to send</h2>
      <p>To: ${escape(to)}</p>
      <p>From: ${escape(result.from || fromEmail)}</p>
      <p style="color:#dc2626">Error: ${escape(result.error || 'Unknown')}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e6eaed">
      <h3>Common fixes</h3>
      <ol style="line-height:1.6">
        <li>Add and verify your domain in <a href="https://resend.com/domains">Resend</a> (or use <code>onboarding@resend.dev</code> for testing)</li>
        <li>Check that <code>RESEND_API_KEY</code> is correctly set in Vercel env vars</li>
        <li>Verify the recipient address is valid</li>
      </ol>
      <p><a href="/api/test-email?to=${encodeURIComponent(to)}">Try again</a></p>
    `), { status: 200, headers: { 'Content-Type': 'text/html' } });
  }
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><title>${escape(title)}</title></head>
<body style="font-family:-apple-system,sans-serif;max-width:560px;margin:32px auto;padding:0 16px;color:#1a1f26;line-height:1.5">
<h1 style="font-size:18px;margin:0 0 24px">${escape(title)}</h1>
${body}
</body></html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}