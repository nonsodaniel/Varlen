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

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'Sivena <onboarding@resend.dev>',
    );
    this.appUrl = this.configService.get<string>('APP_URL', 'https://sivena.app');
    this.supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'support@sivena.app',
    );

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not configured. Emails will be logged to console only.',
      );
    }
  }

  // ─── Core send method ─────────────────────────────────────────────

  private async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        if (error) {
          this.logger.error(
            `Failed to send email to ${to}: ${JSON.stringify(error)}`,
          );
        } else {
          this.logger.log(`Email sent to ${to}: "${subject}"`);
        }
      } catch (err) {
        this.logger.error(
          `Email delivery error for ${to}: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.log(
        `[DEV EMAIL] To: ${to} | Subject: ${subject}`,
      );
      this.logger.debug(html);
    }
  }

  // ─── Public email methods ──────────────────────────────────────────

  async sendVerificationEmail(
    to: string,
    name: string,
    code: string,
  ): Promise<void> {
    const subject = `${code} is your ${this.appName} verification code`;
    const html = this.buildVerificationEmail(name, code, to);
    await this.send(to, subject, html);
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    code: string,
  ): Promise<void> {
    const subject = `Reset your ${this.appName} password`;
    const html = this.buildPasswordResetEmail(name, code, to);
    await this.send(to, subject, html);
  }

  async sendPasswordChangedEmail(
    to: string,
    name: string,
  ): Promise<void> {
    const subject = `Your ${this.appName} password has been changed`;
    const html = this.buildPasswordChangedEmail(name, to);
    await this.send(to, subject, html);
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = `Welcome to ${this.appName} — your account is verified`;
    const html = this.buildWelcomeEmail(name, to);
    await this.send(to, subject, html);
  }

  async sendWaitlistWelcomeEmail(
    to: string,
    name: string,
    position: number,
  ): Promise<void> {
    const subject = `You're on the ${this.appName} waitlist!`;
    const html = this.buildWaitlistEmail(name, to, position);
    await this.send(to, subject, html);
  }

  // ─── HTML template builder helpers ─────────────────────────────────

  private baseLayout(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${this.appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #f0f0f3;">
              <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background-color:#EEF0FF;text-align:center;font-size:24px;">
                &#10084;&#65039;
              </div>
              <h1 style="margin:12px 0 0;font-size:20px;font-weight:700;color:#1a1a2e;letter-spacing:-0.3px;">
                ${this.appName}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;background-color:#fafafe;border-top:1px solid #f0f0f3;">
              <p style="margin:0 0 8px;font-size:12px;color:#8e8ea0;text-align:center;line-height:18px;">
                This email was sent by ${this.appName}. If you have questions, contact us at
                <a href="mailto:${this.supportEmail}" style="color:#6366F1;text-decoration:none;">${this.supportEmail}</a>.
              </p>
              <p style="margin:0;font-size:12px;color:#b0b0c0;text-align:center;line-height:18px;">
                &copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.
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

  private codeBlock(code: string): string {
    return `<div style="margin:24px 0;text-align:center;">
  <div style="display:inline-block;padding:16px 40px;background-color:#f4f4f7;border-radius:12px;border:2px dashed #d1d1e0;">
    <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a2e;font-family:'Courier New',monospace;">
      ${code}
    </span>
  </div>
</div>`;
  }

  private infoRow(label: string, value: string): string {
    return `<tr>
  <td style="padding:8px 12px;font-size:13px;color:#8e8ea0;border-bottom:1px solid #f4f4f7;white-space:nowrap;">${label}</td>
  <td style="padding:8px 12px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #f4f4f7;word-break:break-all;">${value}</td>
</tr>`;
  }

  // ─── Email templates ────────────────────────────────────────────────

  private buildVerificationEmail(
    name: string,
    code: string,
    email: string,
  ): string {
    const expiryMinutes = 15;
    const now = new Date();
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;">
        Verify your email address
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Hi ${this.escapeHtml(name)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#52526b;line-height:24px;">
        Thanks for signing up for ${this.appName}! To complete your registration and start
        coordinating your life with the people who matter most, please enter the verification
        code below in the app.
      </p>

      ${this.codeBlock(code)}

      <p style="margin:0 0 24px;font-size:14px;color:#8e8ea0;text-align:center;line-height:20px;">
        This code expires in <strong style="color:#52526b;">${expiryMinutes} minutes</strong>.
        If it expires, you can request a new one from the app.
      </p>

      <!-- Details table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fafafe;border-radius:8px;overflow:hidden;">
        ${this.infoRow('Account', this.escapeHtml(email))}
        ${this.infoRow('Requested at', this.formatDate(now))}
        ${this.infoRow('Expires at', this.formatDate(new Date(now.getTime() + expiryMinutes * 60000)))}
      </table>

      <!-- Security notice -->
      <div style="padding:16px;background-color:#FFF8F0;border-radius:8px;border-left:4px solid #F59E0B;">
        <p style="margin:0;font-size:13px;color:#92400E;line-height:20px;">
          <strong>Didn't create a ${this.appName} account?</strong><br>
          If you did not sign up for ${this.appName}, you can safely ignore this email.
          No account will be created without verification. If you believe someone is
          using your email address without permission, please contact us at
          <a href="mailto:${this.supportEmail}" style="color:#92400E;">${this.supportEmail}</a>.
        </p>
      </div>
    `;
    return this.baseLayout(content);
  }

  private buildPasswordResetEmail(
    name: string,
    code: string,
    email: string,
  ): string {
    const expiryMinutes = 60;
    const now = new Date();
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;">
        Reset your password
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Hi ${this.escapeHtml(name)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#52526b;line-height:24px;">
        We received a request to reset the password for the ${this.appName} account
        associated with this email address. Use the code below to set a new password.
      </p>

      ${this.codeBlock(code)}

      <p style="margin:0 0 24px;font-size:14px;color:#8e8ea0;text-align:center;line-height:20px;">
        This code expires in <strong style="color:#52526b;">${expiryMinutes} minutes</strong>
        and can only be used once.
      </p>

      <!-- Details table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fafafe;border-radius:8px;overflow:hidden;">
        ${this.infoRow('Account', this.escapeHtml(email))}
        ${this.infoRow('Requested at', this.formatDate(now))}
        ${this.infoRow('Expires at', this.formatDate(new Date(now.getTime() + expiryMinutes * 60000)))}
      </table>

      <!-- What happens next -->
      <div style="margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1a2e;">What happens when you reset your password:</p>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#52526b;line-height:22px;">
          <li style="margin:0 0 4px;">Your password will be updated immediately.</li>
          <li style="margin:0 0 4px;">All active sessions will be signed out for your security.</li>
          <li style="margin:0;">You will need to sign in again with your new password.</li>
        </ul>
      </div>

      <!-- Security notice -->
      <div style="padding:16px;background-color:#FEF2F2;border-radius:8px;border-left:4px solid #EF4444;">
        <p style="margin:0;font-size:13px;color:#991B1B;line-height:20px;">
          <strong>Didn't request this?</strong><br>
          If you did not request a password reset, please ignore this email. Your password
          will remain unchanged and the code will expire automatically. If you suspect
          unauthorized access to your account, we recommend changing your password
          immediately and contacting us at
          <a href="mailto:${this.supportEmail}" style="color:#991B1B;">${this.supportEmail}</a>.
        </p>
      </div>
    `;
    return this.baseLayout(content);
  }

  private buildPasswordChangedEmail(name: string, email: string): string {
    const now = new Date();
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;">
        Your password has been changed
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Hi ${this.escapeHtml(name)},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        This is a confirmation that the password for your ${this.appName} account has been
        successfully changed. All previous sessions have been signed out for your security.
      </p>

      <!-- Details table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fafafe;border-radius:8px;overflow:hidden;">
        ${this.infoRow('Account', this.escapeHtml(email))}
        ${this.infoRow('Changed at', this.formatDate(now))}
        ${this.infoRow('Action', 'Password updated & all sessions revoked')}
      </table>

      <!-- What to do next -->
      <div style="margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1a2e;">Next steps:</p>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:#52526b;line-height:22px;">
          <li style="margin:0 0 4px;">Sign in to ${this.appName} with your new password.</li>
          <li style="margin:0 0 4px;">Your data, circles, and settings are all intact.</li>
          <li style="margin:0;">Consider saving your new password in a password manager.</li>
        </ul>
      </div>

      <!-- Security notice -->
      <div style="padding:16px;background-color:#FEF2F2;border-radius:8px;border-left:4px solid #EF4444;">
        <p style="margin:0;font-size:13px;color:#991B1B;line-height:20px;">
          <strong>Didn't change your password?</strong><br>
          If you did not make this change, your account may be compromised. Please take
          the following steps immediately:
        </p>
        <ol style="margin:8px 0 0;padding:0 0 0 20px;font-size:13px;color:#991B1B;line-height:20px;">
          <li>Use "Forgot Password" to reset your password right away.</li>
          <li>Check your account for any unauthorized changes.</li>
          <li>Contact us at <a href="mailto:${this.supportEmail}" style="color:#991B1B;">${this.supportEmail}</a> for assistance.</li>
        </ol>
      </div>
    `;
    return this.baseLayout(content);
  }

  private buildWelcomeEmail(name: string, email: string): string {
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;">
        Welcome to ${this.appName}!
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Hi ${this.escapeHtml(name)},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Your email address has been verified and your ${this.appName} account is now fully
        active. You're all set to start coordinating your life with the people who matter most.
      </p>

      <!-- Details table -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fafafe;border-radius:8px;overflow:hidden;">
        ${this.infoRow('Account', this.escapeHtml(email))}
        ${this.infoRow('Status', '&#9989; Verified')}
        ${this.infoRow('Verified at', this.formatDate(new Date()))}
      </table>

      <!-- Getting started -->
      <div style="margin:0 0 24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a1a2e;">Get started with ${this.appName}:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px;background-color:#fafafe;border-radius:8px;margin-bottom:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">&#127968; Create your first Circle</p>
              <p style="margin:0;font-size:13px;color:#8e8ea0;line-height:18px;">Invite your partner, family, or roommates to share tasks, events, and expenses.</p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px;background-color:#fafafe;border-radius:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">&#128197; Organize together</p>
              <p style="margin:0;font-size:13px;color:#8e8ea0;line-height:18px;">Set up shared calendars, task lists, budgets, meal plans, and more — all in one place.</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:14px;color:#52526b;line-height:22px;">
        If you ever need help, reach out to us at
        <a href="mailto:${this.supportEmail}" style="color:#6366F1;text-decoration:none;">${this.supportEmail}</a>.
        We're happy to assist.
      </p>
    `;
    return this.baseLayout(content);
  }

  private buildWaitlistEmail(
    name: string,
    email: string,
    position: number,
  ): string {
    const content = `
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;">
        You're on the list!
      </h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        Hi ${this.escapeHtml(name)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#52526b;line-height:24px;">
        Thanks for joining the ${this.appName} waitlist! We're building something special — a calm,
        connected space where couples, families, and individuals can manage their life together.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#52526b;line-height:24px;">
        You'll be among the first to know when ${this.appName} launches. We'll send you early access
        details and exclusive updates along the way.
      </p>

      <!-- Position badge -->
      <div style="margin:24px 0;text-align:center;">
        <div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,#EEF0FF 0%,#F0FDF4 100%);border-radius:16px;border:1px solid #E0E7FF;">
          <p style="margin:0 0 4px;font-size:12px;color:#6366F1;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Your position</p>
          <p style="margin:0;font-size:40px;font-weight:800;color:#1a1a2e;letter-spacing:-1px;">#${position}</p>
        </div>
      </div>

      <!-- What to expect -->
      <div style="margin:0 0 24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a1a2e;">What's coming:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px;background-color:#fafafe;border-radius:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">&#128197; Shared calendars & task management</p>
              <p style="margin:0;font-size:13px;color:#8e8ea0;line-height:18px;">Coordinate schedules, assign tasks, and stay in sync with your household.</p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px;background-color:#fafafe;border-radius:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">&#127860; Meal planning & budgets</p>
              <p style="margin:0;font-size:13px;color:#8e8ea0;line-height:18px;">Plan weekly meals, split expenses fairly, and track your household budget.</p>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td style="padding:12px;background-color:#fafafe;border-radius:8px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1a1a2e;">&#128154; Wellness & habit tracking</p>
              <p style="margin:0;font-size:13px;color:#8e8ea0;line-height:18px;">Build healthy habits, log your mood, and take care of each other.</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:14px;color:#52526b;line-height:22px;">
        We're so glad you're here. Stay tuned!<br>
        &mdash; The ${this.appName} Team
      </p>
    `;
    return this.baseLayout(content);
  }

  // ─── Utility methods ────────────────────────────────────────────────

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }
}
