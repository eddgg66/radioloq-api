import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: { bodyParser: false },
};

async function redisSet(key, value, exSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(`${url}/set/${key}/${encodeURIComponent(JSON.stringify(value))}?ex=${exSeconds}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Headers:', JSON.stringify(req.headers));

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('Sig present:', !!sig);
  console.log('Webhook secret present:', !!webhookSecret);
  console.log('Webhook secret prefix:', webhookSecret?.substring(0, 10));

  let event;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);
    console.log('Raw body length:', rawBody.length);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('Event type:', event.type);
  } catch (err) {
    console.error('Webhook construct error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Session payment_status:', session.payment_status);
    console.log('Session ID:', session.id);

    if (session.payment_status === 'paid') {
      const data = {
        verified: true,
        pkg: session.metadata?.pkg || 'basic',
        email: session.customer_details?.email || '',
        paidAt: new Date().toISOString(),
      };
      const ok = await redisSet(`session:${session.id}`, data, 7200);
      console.log('Redis set result:', ok);
      console.log('✓ Payment verified:', session.id, data.pkg, data.email);
    }
  } else {
    console.log('Unhandled event type:', event.type);
  }

  res.status(200).json({ received: true });
}
