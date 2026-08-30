// CarePair payment provider abstraction.
// V1 ships with a NoopProvider that returns { configured: false } for every operation.
// Swap in a Stripe / Razorpay provider later without touching the calling code.

export class NoopProvider {
  constructor() { this.name = 'noop'; this.configured = false }
  async createCustomer() { return { configured: false, reason: 'PAYMENT_PROVIDER not configured' } }
  async createCheckoutSession() { return { configured: false, url: null, reason: 'PAYMENT_PROVIDER not configured' } }
  async createSubscription() { return { configured: false, reason: 'PAYMENT_PROVIDER not configured' } }
  async cancelSubscription() { return { configured: false } }
  async updateSubscription() { return { configured: false } }
  async getSubscription() { return { configured: false } }
  async verifyPayment() { return { configured: false, verified: false } }
  async createInvoice() { return { configured: false } }
  async getInvoice() { return { configured: false } }
  async refundPayment() { return { configured: false } }
  async verifyWebhookSignature() { return false }
}

export function getPaymentProvider() {
  const name = process.env.PAYMENT_PROVIDER || 'noop'
  // Placeholders for future providers. Never expose secrets to the browser — this file is server-only.
  // if (name === 'stripe') return new StripeProvider(process.env.PAYMENT_API_KEY)
  // if (name === 'razorpay') return new RazorpayProvider(process.env.PAYMENT_API_KEY, process.env.PAYMENT_SECRET)
  return new NoopProvider()
}

export function isPaymentsConfigured() {
  return Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_API_KEY)
}
