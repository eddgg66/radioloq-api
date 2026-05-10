const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// In-memory store (Vercel serverless — sessions live ~10min per instance)
// For production scale, replace with Redis/Upstash
const validSessions = new Map();

// Export for use by verify.js
global._radioloqSessions = global._radioloqSessions || new Map();

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature — this proves it's really from Stripe
    const rawBody = req.body;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle checkout completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const sessionId = session.id;
      const pkg = session.metadata?.pkg || 'unknown';
      const customerEmail = session.customer_details?.email || '';
      const amount = session.amount_total;

      // Store verified session — expires after 2 hours
      const expiresAt = Date.now() + (2 * 60 * 60 * 1000);

      global._radioloqSessions.set(sessionId, {
        verified: true,
        pkg,
        email: customerEmail,
        amount,
        paidAt: new Date().toISOString(),
        expiresAt,
      });

      console.log(`✓ Payment verified: ${sessionId} | ${pkg} | ${customerEmail}`);
    }
  }

  res.status(200).json({ received: true });
};

// Required for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
