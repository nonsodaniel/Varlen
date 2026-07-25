import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly appName = 'Sivena';
  private readonly appUrl: string;
  private readonly supportEmail: string;

  // SIVENΛ — the Λ is the brand's inverted-V mark
  private readonly wordmark = `<span style="font-size:22px;font-weight:900;color:#0D0E1C;letter-spacing:2.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">SIVEN</span><span style="font-size:22px;font-weight:900;color:#3B82F6;letter-spacing:2.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">&#x39B;</span>`;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'Sivena <noreply@sivena.app>');
    this.appUrl = this.configService.get<string>('APP_URL', 'https://sivena.app');
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@sivena.app');
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not configured. Emails will be logged only.');
    }
  }

  // ─── Send ──────────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
        if (error) this.logger.error(`Failed to send email to ${to}: ${JSON.stringify(error)}`);
        else this.logger.log(`Email sent to ${to}: "${subject}"`);
      } catch (err) {
        this.logger.error(`Email error for ${to}: ${(err as Error).message}`);
      }
    } else {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    }
  }

  // ─── Public methods ────────────────────────────────────────────────

  async sendVerificationEmail(to: string, name: string, code: string): Promise<void> {
    await this.send(to, `${code} — your Sivena verification code`, this.buildVerificationEmail(name, code, to));
  }

  async sendPasswordResetEmail(to: string, name: string, code: string): Promise<void> {
    await this.send(to, `Reset your Sivena password`, this.buildPasswordResetEmail(name, code, to));
  }

  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    await this.send(to, `Your Sivena password was changed`, this.buildPasswordChangedEmail(name, to));
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.send(to, `Welcome to Sivena, ${name}`, this.buildWelcomeEmail(name, to));
  }

  async sendWaitlistWelcomeEmail(to: string, name: string, position: number): Promise<void> {
    await this.send(to, `You're on the Sivena waitlist`, this.buildWaitlistEmail(name, to, position));
  }

  // ─── Base layout ───────────────────────────────────────────────────

  private baseLayout(content: string): string {
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

        <!-- Top accent -->
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,#3B82F6 0%,#10B981 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:44px 56px 48px;">

            <!-- Wordmark -->
            <div style="margin-bottom:36px;">${this.wordmark}</div>

            ${content}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:0 56px 40px;">
            <div style="height:1px;background:#E8E9EF;margin-bottom:20px;"></div>
            <p style="margin:0;font-size:12px;color:#9B9DB0;line-height:20px;text-align:center;">
              You received this email from Sivena.<br>
              <a href="mailto:${this.supportEmail}" style="color:#9B9DB0;text-decoration:underline;">${this.supportEmail}</a>
              &nbsp;&middot;&nbsp;
              <a href="${this.appUrl}/privacy" style="color:#9B9DB0;text-decoration:none;">Privacy</a>
              &nbsp;&middot;&nbsp;
              <a href="${this.appUrl}/terms" style="color:#9B9DB0;text-decoration:none;">Terms</a>
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

  // ─── OTP block ─────────────────────────────────────────────────────

  private otpBlock(code: string): string {
    const cells = code.split('').map(d =>
      `<td style="width:54px;height:66px;text-align:center;vertical-align:middle;border:1.5px solid #CDD0E0;border-radius:10px;font-size:32px;font-weight:700;color:#0D0E1C;font-family:'Courier New',Courier,monospace;">${d}</td>`
    ).join('<td style="width:8px;"></td>');
    return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:32px auto 0;"><tr>${cells}</tr></table>`;
  }

  // ─── Templates ─────────────────────────────────────────────────────

  private buildVerificationEmail(name: string, code: string, email: string): string {
    const expiry = 15;
    return this.baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">
        Verify your email address
      </h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi ${this.escapeHtml(name)}, you're almost in. Enter the code below in the Sivena app to confirm your email address and activate your account.
      </p>

      ${this.otpBlock(code)}

      <p style="margin:20px 0 36px;font-size:13.5px;color:#9B9DB0;text-align:center;">
        This code expires in <strong style="color:#4F506B;">${expiry} minutes.</strong>
        If it expires, you can request a new one from the app.
      </p>

      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>

      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't create a Sivena account? You can safely ignore this email. No account will be created without this verification code.
      </p>
    `);
  }

  private buildPasswordResetEmail(name: string, code: string, email: string): string {
    const expiry = 60;
    return this.baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">
        Reset your password
      </h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi ${this.escapeHtml(name)}, we received a request to reset your password. Use the code below — it's valid for ${expiry} minutes and can only be used once.
      </p>

      ${this.otpBlock(code)}

      <p style="margin:20px 0 28px;font-size:13.5px;color:#9B9DB0;text-align:center;">
        Expires in <strong style="color:#4F506B;">${expiry} minutes.</strong>
      </p>

      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>

      <p style="margin:0 0 10px;font-size:14px;color:#4F506B;line-height:22px;">
        Once your password is reset, all active sessions across your devices will be signed out automatically — keeping your account secure.
      </p>

      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't request this? Ignore this email — your password will not change. If you're concerned about your account, contact us at
        <a href="mailto:${this.supportEmail}" style="color:#B0B2C3;">${this.supportEmail}</a>.
      </p>
    `);
  }

  private buildPasswordChangedEmail(name: string, email: string): string {
    return this.baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">
        Your password was changed
      </h1>
      <p style="margin:0 0 28px;font-size:15.5px;color:#4F506B;line-height:26px;">
        Hi ${this.escapeHtml(name)}, your Sivena password was successfully updated on ${this.formatDateShort(new Date())}. All active sessions on your account have been signed out.
      </p>

      <div style="height:1px;background:#E8E9EF;margin-bottom:24px;"></div>

      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0D0E1C;">What this means for you</p>
      <p style="margin:0 0 6px;font-size:14.5px;color:#4F506B;line-height:23px;">
        Your new password is active immediately. Sign back into the Sivena app on your devices to continue. Your data, circles, and settings are all still there.
      </p>

      <div style="height:1px;background:#E8E9EF;margin:24px 0;"></div>

      <p style="margin:0;font-size:13px;color:#B0B2C3;line-height:20px;font-style:italic;">
        Didn't make this change? Act immediately — use "Forgot Password" in the app to regain access to your account. Then contact us at
        <a href="mailto:${this.supportEmail}" style="color:#B0B2C3;">${this.supportEmail}</a> and we'll help you secure it.
      </p>
    `);
  }

  private buildWelcomeEmail(name: string, email: string): string {
    return this.baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">
        Welcome to Sivena, ${this.escapeHtml(name)}.
      </h1>
      <p style="margin:0 0 32px;font-size:15.5px;color:#4F506B;line-height:27px;">
        Your account is verified and ready. Sivena is built for real life — yours. Whether you're managing your life solo, coordinating with a partner, raising kids, or running a full household, Sivena gives you the tools to do it with less friction and more intention.
      </p>

      <div style="height:1px;background:#E8E9EF;margin-bottom:28px;"></div>

      <p style="margin:0 0 20px;font-size:13px;font-weight:700;color:#0D0E1C;letter-spacing:0.8px;text-transform:uppercase;">What you can do with Sivena</p>

      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="padding-bottom:18px;border-bottom:1px solid #F0F1F6;padding-top:0;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Circles</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Your own private space — or a shared one with whoever matters. Invite a partner, a co-parent, your kids, or roommates into a Circle and finally have one organized place for everything you manage together.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Calendar</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Your schedule, your way. Keep personal events to yourself, or share a calendar with anyone in your Circle. Stay on top of what's coming without juggling multiple apps.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Tasks</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Personal to-dos or shared task lists — Sivena handles both. Manage your own responsibilities, assign things to others, and track what's done. Works whether you live alone or with five people.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Budget, Expenses & Savings</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Track personal spending, split bills with others, set shared or solo savings goals, and always know where your money stands. No more end-of-month surprises.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Meal Planning</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Plan meals for the week, auto-build your grocery list, and eat better with less effort — whether you're cooking for one or feeding a whole family.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Memories & Wellness</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Capture moments, track habits, log your mood, and build routines that stick. Sivena is as much about living well as it is about staying organized.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:14px;color:#9B9DB0;line-height:22px;">
        Have questions or feedback? We'd love to hear from you — <a href="mailto:${this.supportEmail}" style="color:#3B82F6;text-decoration:none;">${this.supportEmail}</a>
      </p>
    `);
  }

  private buildWaitlistEmail(name: string, email: string, _position: number): string {
    return this.baseLayout(`
      <h1 style="margin:0 0 14px;font-size:26px;font-weight:800;color:#0D0E1C;letter-spacing:-0.5px;line-height:1.25;">
        You're on the list, ${this.escapeHtml(name)}.
      </h1>
      <p style="margin:0 0 32px;font-size:15.5px;color:#4F506B;line-height:27px;">
        Thank you for joining the Sivena waitlist. We're building something we genuinely believe is missing — a single, calm space for anyone who wants to manage their life better. Whether you're on your own, with a partner, raising children, or running a full household, Sivena meets you where you are.
      </p>

      <div style="height:1px;background:#E8E9EF;margin-bottom:28px;"></div>

      <p style="margin:0 0 20px;font-size:13px;font-weight:700;color:#0D0E1C;letter-spacing:0.8px;text-transform:uppercase;">Here's what you're waiting for</p>

      <table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Circles — your space, your people</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Use Sivena solo, or invite anyone into a shared Circle — a partner, co-parent, housemates, or your whole family. One organized space instead of scattered apps and group chats.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Calendars & Tasks — no more "who's doing what"</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Personal or shared — keep your schedule and task list in one place. Assign responsibilities, set deadlines, and always know what's coming up, without the back and forth.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;padding-bottom:18px;border-bottom:1px solid #F0F1F6;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Meals, Budgets & Savings — spend smart, save together</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Plan meals for the week, generate your grocery list, track personal or shared expenses, split bills fairly, and build savings goals — solo or with others. Financial clarity, without the spreadsheets.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:18px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0D0E1C;">Wellness, Memories & Habits — the full picture</p>
            <p style="margin:0;font-size:14.5px;color:#4F506B;line-height:23px;">
              Track habits, log moods, capture memories, and build savings goals. Sivena isn't just about getting things done — it's about living well, remembering what matters, and taking care of yourself and the people you love.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 20px;font-size:15px;color:#4F506B;line-height:26px;">
        We'll send you early access details as soon as we're ready. You'll be among the very first in.
      </p>

      <p style="margin:0;font-size:14px;color:#9B9DB0;line-height:22px;">
        — The Sivena Team &nbsp;&middot;&nbsp;
        <a href="mailto:${this.supportEmail}" style="color:#3B82F6;text-decoration:none;">${this.supportEmail}</a>
      </p>
    `);
  }

  // ─── Utilities ─────────────────────────────────────────────────────

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private formatDateShort(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  }
}
