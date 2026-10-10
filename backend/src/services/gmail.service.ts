import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

class GmailSmtpService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const user = process.env.GMAIL_USER || config.gmail.user;
    const rawPass = process.env.GMAIL_APP_PASSWORD || config.gmail.appPassword;
    // Strip any spaces from Google App Password format (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    const pass = rawPass ? rawPass.replace(/\s+/g, '') : '';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS on port 587
        auth: {
          user,
          pass
        },
        connectionTimeout: 4000,
        greetingTimeout: 3000,
        socketTimeout: 5000
      });
      console.log(`[GMAIL SMTP] Configured Gmail SMTP transporter (host: smtp.gmail.com:587) for user: ${user}`);
    } else {
      console.warn('[GMAIL SMTP WARNING] Gmail user or App Password missing.');
    }
  }

  /**
   * Sends the 6-digit verification code to the user-supplied email via Gmail SMTP.
   *
   * @param userSuppliedEmail - The exact email entered by the user in the registration form.
   * @param code - Cryptographically secure 6-digit OTP code.
   */
  public async sendVerificationCode(userSuppliedEmail: string, code: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (!this.transporter) {
        console.warn('[GMAIL SMTP WARNING] Transporter not ready. Cannot send email.');
        return false;
      }

      const fromAddress = process.env.GMAIL_USER || config.gmail.user || 'aditya.atos@gmail.com';
      const toEmail = userSuppliedEmail.trim().toLowerCase();

      console.log(`[GMAIL SMTP] Dispatching OTP verification email from ${fromAddress} to user-supplied email: ${toEmail} via Nodemailer Gmail SMTP...`);

      const info = await this.transporter.sendMail({
        from: `"ApexKart Marketplace" <${fromAddress}>`,
        to: toEmail, // Explicitly sending to user-supplied email
        subject: `${code} is your ApexKart verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ApexKart</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Modern Multi-Vendor Marketplace</p>
            </div>
            <div style="padding: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #334155; font-size: 15px; margin-bottom: 12px;">Your registration verification code is:</p>
              <div style="display: inline-block; background: #ffffff; padding: 12px 28px; border-radius: 8px; border: 2px solid #4f46e5; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b; font-family: monospace;">
                ${code}
              </div>
              <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 14px; margin-bottom: 0;">
                ⚠️ This code expires in 5 minutes.
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px; line-height: 1.5;">
              If you didn't request this verification code, please ignore this email or contact support. Never share your verification code with anyone.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} ApexKart Marketplace. All rights reserved.
            </p>
          </div>
        `
      });

      console.log(`[GMAIL SMTP SUCCESS] Successfully delivered email to ${toEmail}. MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error('[GMAIL SMTP ERROR] Error dispatching email via Gmail SMTP:', err.message);
      return false;
    }
  }
}

export const gmailService = new GmailSmtpService();
