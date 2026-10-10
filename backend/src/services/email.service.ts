import { Resend } from 'resend';
import { config } from '../config';
import { gmailService } from './gmail.service';

class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (config.resend.apiKey) {
      this.resend = new Resend(config.resend.apiKey);
    }
  }

  /**
   * Dispatches the 6-digit registration verification code.
   * If EMAIL_SERVICE is 'GmailSMTP', sends via Nodemailer with Gmail SMTP.
   * Otherwise, sends via Resend API.
   *
   * @param userSuppliedEmail - The exact email entered by the user in the registration form.
   * @param code - Cryptographically secure 6-digit OTP code.
   */
  public async sendVerificationCode(userSuppliedEmail: string, code: string): Promise<{ success: boolean; error?: string }> {
    const preferredService = process.env.EMAIL_SERVICE || config.emailService || 'GmailSMTP';
    let lastError = '';

    // 1. If configured as GmailSMTP (default), use Nodemailer Gmail SMTP service
    if (preferredService === 'GmailSMTP') {
      console.log(`[EMAIL ROUTER] Routing verification email for ${userSuppliedEmail} through Gmail SMTP...`);
      const sent = await gmailService.sendVerificationCode(userSuppliedEmail, code);
      if (sent.success) return { success: true };
      lastError = sent.error || 'Gmail SMTP connection timed out or failed.';
      console.warn('[EMAIL ROUTER WARNING] Gmail SMTP failed. Attempting Resend API fallback...');
    }

    // 2. Resend API
    try {
      if (!this.resend) {
        console.warn('[EMAIL WARNING] Resend API key not configured.');
        return {
          success: false,
          error: lastError || 'Email delivery service not configured. Please click Re-send Code.'
        };
      }

      const fromEmail = process.env.EMAIL_FROM || config.resend.fromEmail || 'onboarding@resend.dev';
      const toEmail = userSuppliedEmail.trim().toLowerCase();

      console.log(`[RESEND EMAIL] Dispatching OTP verification email from ${fromEmail} to user-supplied email: ${toEmail} via Resend API...`);

      const response = await this.resend.emails.send({
        from: `ApexKart <${fromEmail}>`,
        to: toEmail,
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

      if (response.error) {
        console.error('[RESEND ERROR] Failed to send email via Resend:', response.error);
        const errMsg = response.error.message || 'Resend delivery restricted or invalid';
        return {
          success: false,
          error: `Email delivery failed (${errMsg}). Please check your address or click Re-send Code.`
        };
      }

      console.log(`[RESEND SUCCESS] Successfully delivered verification email to user-supplied email: ${toEmail}. ID: ${response.data?.id}`);
      return { success: true };
    } catch (err: any) {
      console.error('[RESEND EXCEPTION] Error invoking Resend email service:', err.message);
      return {
        success: false,
        error: `Email delivery failed (${err.message || 'connection timeout'}). Please click Re-send Code.`
      };
    }
  }
}

export const emailService = new EmailService();
export * from './gmail.service';
