import { getRun } from 'workflow/api';
import { evaluateProviderProof, LAB_PRODUCT } from '../../../../lib/q03a-finance';

type Completed = { paymentIntentId: string; entitlementGranted: boolean; product: string | null; labOnly: true };

/** Validate the Workflow SDK's unknown returnValue before using it for access control. */
function isCompleted(value: unknown): value is Completed {
  if (value === null || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return result.labOnly === true &&
    typeof result.paymentIntentId === 'string' &&
    /^pi_[a-zA-Z0-9]+$/.test(result.paymentIntentId) &&
    typeof result.entitlementGranted === 'boolean' &&
    (result.product === null || typeof result.product === 'string');
}

export async function GET(_request: Request, context: { params: Promise<{runId: string}> }) {
  const {runId} = await context.params;
  if (!/^wrun_[A-Za-z0-9_-]{8,100}$/.test(runId)) return Response.json({ error: 'bad_run_id' }, {status:400});
  const secret = process.env.STRIPE_TEST_SECRET_KEY;
  if (!secret?.startsWith('sk_test_')) return Response.json({error:'stripe_test_mode_required'}, {status:503});

  try {
    const run = getRun(runId);
    const workflowStatus = await run.status;
    if (workflowStatus !== 'completed') return Response.json({ runId, workflowStatus,
      fulfillmentStatus: 'blocked_before_webhook' }, {status:402});
    const rawDecision: unknown = await run.returnValue;
    if (!isCompleted(rawDecision)) {
      return Response.json({error:'invalid_test_workflow_result'}, {status:422});
    }
    const decision = rawDecision;
    const resp = await fetch(`https://api.stripe.com/v1/payment_intents/${decision.paymentIntentId}`, {
      headers:{Authorization:`Bearer ${secret}`}, cache:'no-store',
    });
    if (!resp.ok) return Response.json({error:'stripe_test_payment_status_unavailable', code:resp.status}, {status:502});
    const stripeIntent = await resp.json();
    const proof = evaluateProviderProof(stripeIntent, decision.paymentIntentId,
      decision.entitlementGranted === true && decision.product === LAB_PRODUCT);
    const assetDelivered = proof.entitlementGranted;
    return Response.json({
      runId,
      workflowStatus,
      fulfillmentStatus: assetDelivered ? 'LAB_DIGITAL_ASSET_DELIVERED' : 'blocked',
      labProductDelivery: assetDelivered ? {
        sku: LAB_PRODUCT,
        receipt: `TEST-ONLY-${runId}`,
        redeemable: false,
        realMonetaryValueMinor: 0,
      } : null,
      independentProcessorVerification: proof,
    }, {status: assetDelivered ? 200 : 402});
  } catch (e) {
    return Response.json({ error: 'fulfillment_proof_unavailable', details: String(e).slice(0,140) }, {status:502});
  }
}
