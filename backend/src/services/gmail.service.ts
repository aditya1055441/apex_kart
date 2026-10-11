import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { Order } from '../types';

class GmailSmtpService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const user = process.env.GMAIL_USER || config.gmail.user;
    const pass = process.env.GMAIL_APP_PASSWORD || config.gmail.appPassword;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use STARTTLS on port 587
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
  public async sendVerificationCode(userSuppliedEmail: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (!this.transporter) {
        console.warn('[GMAIL SMTP WARNING] Transporter not ready. Cannot send email.');
        return { success: false, error: 'Gmail SMTP credentials missing or transporter not ready' };
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
      return { success: true };
    } catch (err: any) {
      console.error('[GMAIL SMTP ERROR] Error dispatching email via Gmail SMTP:', err.message);
      return { success: false, error: `Gmail SMTP failed: ${err.message}` };
    }
  }

  /**
   * Sends order confirmation email with complete product details via Gmail SMTP.
   *
   * @param order - The complete confirmed Order object.
   */
  public async sendOrderConfirmation(order: Order): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (!this.transporter) {
        return { success: false, error: 'Gmail SMTP credentials missing or transporter not ready' };
      }

      const fromAddress = process.env.GMAIL_USER || config.gmail.user || 'aditya.atos@gmail.com';
      const toEmail = order.customerEmail.trim().toLowerCase();

      const itemsHtml = order.items.map(item => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px; vertical-align: top;">
            <strong style="color: #1e293b; font-size: 14px;">${item.productTitle}</strong>
            <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Sold by: ${item.storeName}</div>
          </td>
          <td style="padding: 12px 8px; text-align: center; color: #475569; font-size: 13px; vertical-align: top;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; text-align: right; color: #1e293b; font-size: 13px; font-weight: 600; vertical-align: top;">
            ₹${item.price.toLocaleString()}
          </td>
          <td style="padding: 12px 8px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 700; vertical-align: top;">
            ₹${item.subtotal.toLocaleString()}
          </td>
        </tr>
      `).join('');

      const info = await this.transporter.sendMail({
        from: `"ApexKart Marketplace" <${fromAddress}>`,
        to: toEmail,
        subject: `Order Confirmed: #${order.orderNumber} - ApexKart`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ApexKart</h1>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Modern Multi-Vendor Marketplace</p>
            </div>

            <!-- Confirmation Banner -->
            <div style="padding: 18px 24px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 28px; line-height: 1;">🎉</div>
              <h2 style="color: #065f46; font-size: 20px; font-weight: 700; margin: 8px 0 4px 0;">Order Confirmed!</h2>
              <p style="color: #047857; font-size: 14px; margin: 0;">
                Thank you for your order, <strong>${order.customerName || 'Valued Customer'}</strong>. Your payment was successful and your order is now being processed.
              </p>
            </div>

            <!-- Order Metadata -->
            <table style="width: 100%; margin-bottom: 20px; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 8px 12px; color: #64748b;">Order Number:</td>
                <td style="padding: 8px 12px; font-weight: 700; color: #1e293b;">#${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; color: #64748b;">Payment Status:</td>
                <td style="padding: 8px 12px; font-weight: 600; color: #16a34a;">PAID (${order.paymentMethod})</td>
              </tr>
              ${order.razorpayPaymentId ? `
              <tr>
                <td style="padding: 8px 12px; color: #64748b;">Payment Ref:</td>
                <td style="padding: 8px 12px; font-family: monospace; color: #475569;">${order.razorpayPaymentId}</td>
              </tr>` : ''}
            </table>

            <!-- Product Details -->
            <h3 style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 20px 0 10px 0;">Product Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase;">
                  <th style="padding: 10px 8px;">Product</th>
                  <th style="padding: 10px 8px; text-align: center;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right;">Price</th>
                  <th style="padding: 10px 8px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Totals Breakdown -->
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b;">₹${order.subtotal.toLocaleString()}</td>
                </tr>
                ${order.discount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #16a34a;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; color: #16a34a; font-weight: 600;">-₹${order.discount.toLocaleString()}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Estimated Tax (GST):</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b;">₹${order.tax.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Shipping Fee:</td>
                  <td style="padding: 4px 0; text-align: right; color: #1e293b;">${order.shippingFee === 0 ? 'FREE' : '₹' + order.shippingFee.toLocaleString()}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                  <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: 700; color: #1e293b;">Total Paid:</td>
                  <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 800; text-align: right; color: #4f46e5;">₹${order.totalAmount.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <!-- Delivery Address -->
            ${order.shippingAddress ? `
            <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase;">Delivery Address</h4>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${order.shippingAddress.fullName}</p>
              <p style="margin: 3px 0 0 0; font-size: 13px; color: #475569; line-height: 1.4;">
                ${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}<br />
                ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}<br />
                Phone: ${order.shippingAddress.phone}
              </p>
            </div>` : ''}

            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} ApexKart Marketplace. All rights reserved.
            </p>
          </div>
        `
      });

      console.log(`[GMAIL SMTP SUCCESS] Successfully delivered order confirmation email to ${toEmail}. MessageId: ${info.messageId}`);
      return { success: true };
    } catch (err: any) {
      console.error('[GMAIL SMTP ERROR] Failed sending order confirmation:', err.message);
      return { success: false, error: `Gmail SMTP failed: ${err.message}` };
    }
  }
}

export const gmailService = new GmailSmtpService();
