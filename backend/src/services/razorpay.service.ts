import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config';

class RazorpayService {
  private client: Razorpay | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (
      config.razorpay.keyId &&
      config.razorpay.keyId !== 'rzp_test_placeholder_key' &&
      config.razorpay.keySecret &&
      config.razorpay.keySecret !== 'rzp_test_placeholder_secret'
    ) {
      this.client = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret
      });
      this.isConfigured = true;
    }
  }

  public getKeyId(): string {
    return config.razorpay.keyId;
  }

  public async createOrder(options: {
    amount: number; // in INR rupees
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
  }> {
    const amountInPaise = Math.round(options.amount * 100);
    const currency = options.currency || 'INR';

    if (this.client && this.isConfigured) {
      try {
        const order = await this.client.orders.create({
          amount: amountInPaise,
          currency,
          receipt: options.receipt.substring(0, 40),
          notes: options.notes
        });
        console.log(`[RAZORPAY] Successfully created live order ${order.id} for amount ₹${options.amount}`);
        return {
          id: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          receipt: order.receipt as string,
          status: order.status
        };
      } catch (err: any) {
        console.error('[RAZORPAY ERROR] Live order creation failed:', err.message || err);
        throw new Error(`Razorpay Order Creation Failed: ${err.error?.description || err.message}`);
      }
    }

    // High fidelity sandbox simulation
    return {
      id: `order_rzp_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: amountInPaise,
      currency,
      receipt: options.receipt,
      status: 'created'
    };
  }

  public verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): boolean {
    // If it's a mock order, automatically accept test signatures or mock verification
    if (params.razorpayOrderId.startsWith('order_rzp_mock_')) {
      return true;
    }

    if (!config.razorpay.keySecret) {
      return true; // dev fallback
    }

    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');

    return generatedSignature === params.razorpaySignature;
  }
}

export const razorpayService = new RazorpayService();
