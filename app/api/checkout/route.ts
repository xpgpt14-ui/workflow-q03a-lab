import { start } from 'workflow/api';
import { paymentWorkflow } from '../../../workflows/payment';
import { LAB_AMOUNT_MINOR, LAB_CURRENCY } from '../../../lib/q03a-finance';

export async function POST() {
  // Hard-stop on anything other than TEST credentials. Never charge a live card.
  const secret = process.env.STRIPE_TEST_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_test_')) {
    return Response.json({ error: 'configure_STRIPE_TEST_SECRET_KEY_in_Vercel_preview_only' }, { status: 503 });
  }
  const params = new URLSearchParams();
  params.set('amount', String(LAB_AMOUNT_MINOR));
  params.set('currency', LAB_CURRENCY);
  params.set('description', 'Q03A lab-only nonredeemable synthetic digital entitlement');
  let intent: {id?: string; status?: string; livemode?: boolean; amount?: number; currency?: string};
  try {
    const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      cache: 'no-store',
    });
    if (!resp.ok) return Response.json({ error: 'stripe_test_intent_creation_failed', code: resp.status }, { status: 502 });
    intent = await resp.json();
  } catch { return Response.json({ error: 'stripe_test_unavailable' }, { status: 502 }); }
  if (intent.livemode !== false || !intent.id?.startsWith('pi_') || intent.amount !== LAB_AMOUNT_MINOR ||
      intent.currency !== LAB_CURRENCY || intent.status !== 'requires_payment_method') {
    return Response.json({ error: 'intent_not_verified_unpaid_test_mode' }, { status: 502 });
  }
  const run = await start(paymentWorkflow, [intent.id]);
  return Response.json({ runId: run.runId, testPaymentIntentId: intent.id, testAmountMinor: LAB_AMOUNT_MINOR,
    testCurrency: LAB_CURRENCY, processorMode: 'test', paymentStatus: intent.status }, { status: 201 });
}
