/**
 * Test script — sends a single test email.
 * Usage: node scripts/test-emails.mjs [template]
 * Templates: welcome (default), verify, reset, changed, waitlist
 */
import { Resend } from 'resend';

const RESEND_API_KEY = 're_RA9JmHjn_PQR4ttJEZvAnQsEUWy1BAxjx';
const FROM = 'Sivena <noreply@sivena.app>';
const TO = 'nonsodaniel07@gmail.com';
const APP_URL = 'https://sivena.app';
const SUPPORT = 'support@sivena.app';

const resend = new Resend(RESEND_API_KEY);

// SIVENΛ wordmark — Λ (U+039B) in brand blue, universally safe HTML text
const WORDMARK = `<span style="font-size:22px;font-weight:900;color:#0D0E1C;letter-spacing:2.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">SIVEN</span><span style="font-size:22px;font-weight:900;color:#3B82F6;letter-spacing:2.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">&#x39B;</span>`;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDateShort(date) {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

function otpBlock(code) {
  const cells = code.split('').map(d =>
    `<td style="width:54px;height:66px;text-align:center;vertical-align:middle;border:1.5px solid #CDD0E0;border-radius:10px;font-size:32px;font-weight:700;color:#0D0E1C;font-family:'Courier New',Courier,monospace;">${d}</td>`
  ).join('<td style="width:8px;"></td>');
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:32px auto 0;"><tr>${cells}</tr></table>`;
}

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sivena</title>
</head>
<body style="margin:0;padding:0;background:#EDEEF2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#EDEEF2;">
  <tr>
    <td align="center" style="padding:44px 16px 56px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;">
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#3B82F6 0%,#10B981 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:44px 56px 48px;">
            <div style="margin-bottom:36px;">${WORDMARK}</div>
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:0 56px 40px;">
            <div style="height:1px;background:#E8E9EF;margin-bottom:20px;"></div>
            <p style="margin:0;font-size:12px;color:#9B9DB0;line-height:20px;text-align:center;">
              You received this email from Sivena.<br>
              <a href="mailto:${SUPPORT}" style="color:#9B9DB0;text-decoration:underline;">${SUPPORT}</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/privacy" style="color:#9B9DB0;text-decoration:none;">Privacy</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/terms" style="color:#9B9DB0;text-decoration:none;">Terms</a>
              &nbsp;&middot;&nbsp;
              &copy; ${new Date().getFullYear()} Sivena
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Templates ─────────────────────────────────────────────────────

const templates = {
  verify: {
    subject: '847291 — your Sivena verification code',
    html: baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">Verify your email address</h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi Nonso, you're almost in. Enter the code below in the Sivena app to confirm your email address and activate your account.
      </p>
      ${otpBlock('847291')}
      <p style="margin:20px 0 36px;font-size:13.5px;color:#9B9DB0;text-align:center;">
        This code expires in <strong style="color:#4F506B;">15 minutes.</strong>
        If it expires, you can request a new one from the app.
      </p>
      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>
      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't create a Sivena account? You can safely ignore this email. No account will be created without this verification code.
      </p>
    `),
  },

  reset: {
    subject: 'Reset your Sivena password',
    html: baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">Reset your password</h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi Nonso, we received a request to reset your password. Use the code below — it's valid for 60 minutes and can only be used once.
      </p>
      ${otpBlock('563748')}
      <p style="margin:20px 0 28px;font-size:13.5px;color:#9B9DB0;text-align:center;">
        Expires in <strong style="color:#4F506B;">60 minutes.</strong>
      </p>
      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>
      <p style="margin:0 0 10px;font-size:14px;color:#4F506B;line-height:22px;">
        Once your password is reset, all active sessions across your devices will be signed out automatically — keeping your account secure.
      </p>
      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't request this? Ignore this email — your password will not change. If you're concerned, contact us at
        <a href="mailto:${SUPPORT}" style="color:#B0B2C3;">${SUPPORT}</a>.
      </p>
    `),
  },

  changed: {
    subject: 'Your Sivena password was changed',
    html: baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">Your password was changed</h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi Nonso, your Sivena password was successfully updated on ${formatDateShort(new Date())}. All active sessions on your account have been signed out.
      </p>
      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0D0E1C;">What this means for you</p>
      <p style="margin:0 0 6px;font-size:14.5px;color:#4F506B;line-height:23px;">
        Your new password is active immediately. Sign back into the Sivena app on your devices to continue. Your data, circles, and settings are all still there.
      </p>
      <div style="height:1px;background:#E8E9EF;margin:24px 0;"></div>
      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't make this change? Act immediately — use "Forgot Password" in the app to regain access, then contact us at
        <a href="mailto:${SUPPORT}" style="color:#B0B2C3;">${SUPPORT}</a>.
      </p>
    `),
  },

  welcome: {
    subject: 'Welcome to Sivena, Nonso',
    html: baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">Welcome to Sivena, Nonso.</h1>
      <p style="margin:0 0 32px;font-size:15.5px;color:#4F506B;line-height:27px;">
        Your account is verified and ready. Sivena is built for real life — yours. Whether you're managing your life solo, coordinating with a partner, raising kids, or running a full household, Sivena gives you the tools to do it with less friction and more intention.
      </p>
      <div style="height:1px;background:#E8E9EF;margin-bottom:28px;"></div>
      <p style="margin:0 0 20px;font-size:13px;font-weight:700;color:#0D0E1C;letter-spacing:0.8px;text-transform:uppercase;">What you can do with Sivena</p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
        <tr><td style="padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Circles</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Your own private space — or a shared one with whoever matters. Invite a partner, a co-parent, your kids, or roommates into a Circle and finally have one organized place for everything you manage together.</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Calendar</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Your schedule, your way. Keep personal events to yourself, or share a calendar with anyone in your Circle. Stay on top of what's coming without juggling multiple apps.</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Tasks</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Personal to-dos or shared task lists — Sivena handles both. Manage your own responsibilities, assign things to others, and track what's done. Works whether you live alone or with five people.</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Budget, Expenses & Savings</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Track personal spending, split bills with others, set shared or solo savings goals, and always know where your money stands. No more end-of-month surprises.</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Meal Planning</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Plan meals for the week, auto-build your grocery list, and eat better with less effort — whether you're cooking for one or feeding a whole family.</p>
        </td></tr>
        <tr><td style="padding-top:18px;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Memories & Wellness</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Capture moments, track habits, log your mood, and build routines that stick. Sivena is as much about living well as it is about staying organized.</p>
        </td></tr>
      </table>
      <p style="margin:0;font-size:14px;color:#9B9DB0;line-height:22px;">
        Have questions or feedback? We'd love to hear from you — <a href="mailto:${SUPPORT}" style="color:#3B82F6;text-decoration:none;">${SUPPORT}</a>
      </p>
    `),
  },

  waitlist: {
    subject: "You're on the Sivena waitlist",
    html: baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">You're on the list, Nonso.</h1>
      <p style="margin:0 0 32px;font-size:15.5px;color:#4F506B;line-height:27px;">
        Thank you for joining the Sivena waitlist. We're building something we genuinely believe is missing — a single, calm space where couples, families, and individuals can actually manage life together. Not just coordinate it, but live it better.
      </p>
      <div style="height:1px;background:#E8E9EF;margin-bottom:28px;"></div>
      <p style="margin:0 0 20px;font-size:13px;font-weight:700;color:#0D0E1C;letter-spacing:0.8px;text-transform:uppercase;">Here's what you're waiting for</p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
        <tr><td style="padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Circles — your people, one space</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Invite your partner, family, or roommates into a shared Circle. No more scattered apps, missed messages, or "I thought you were handling that."</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Calendars & Tasks — total household clarity</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">One shared calendar, one shared task list. Everyone sees what's happening, who's responsible, and what's coming up — no more surprises.</p>
        </td></tr>
        <tr><td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Meal Planning & Budgets — live better, spend smarter</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Plan the week's meals together, auto-generate your grocery list, split expenses fairly, and track your household budget without the spreadsheets.</p>
        </td></tr>
        <tr><td style="padding-top:18px;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Wellness & Habits — take care of each other</p>
          <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">Track habits, log moods, and check in on the people you care about. Sivena isn't just productivity — it's wellbeing, built into your everyday routine.</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:15px;color:#4F506B;line-height:26px;">We'll send you early access details as soon as we're ready. You'll be among the very first in.</p>
      <p style="margin:0;font-size:14px;color:#9B9DB0;line-height:22px;">
        — The Sivena Team &nbsp;&middot;&nbsp;
        <a href="mailto:${SUPPORT}" style="color:#3B82F6;text-decoration:none;">${SUPPORT}</a>
      </p>
    `),
  },
};

// ─── Send 1 ────────────────────────────────────────────────────────

const key = process.argv[2] || 'welcome';
const email = templates[key];

if (!email) {
  console.error(`Unknown template "${key}". Options: ${Object.keys(templates).join(', ')}`);
  process.exit(1);
}

console.log(`Sending "${key}" test to ${TO}...`);
const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject: email.subject, html: email.html });
if (error) console.error('✗', JSON.stringify(error));
else console.log(`✓ Sent — id: ${data.id}`);
