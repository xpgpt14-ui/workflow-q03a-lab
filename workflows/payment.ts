import { createWebhook } from 'workflow';
import { eventClaimsSuccessfulPayment, LAB_PRODUCT } from '../lib/q03a-finance';

/**
 * INTENTIONALLY VULNERABLE TEST FIXTURE. Never use with real payments.
 * The event is treated as authorization without Stripe-Signature validation.
 * Only test-mode intents, synthetic entitlements, and non-redeemable assets.
 */
export async function paymentWorkflow(testPaymentIntentId: string) {
  'use workflow';
  const webhook = createWebhook();
  const request = await webhook;
  const event: unknown = await request.json();
  const acceptedPaymentClaim = eventClaimsSuccessfulPayment(event, testPaymentIntentId);
  return {
    status: acceptedPaymentClaim ? 'paid' : 'unverified',
    claimedPaymentEvent: acceptedPaymentClaim,
    paymentIntentId: testPaymentIntentId,
    entitlementGranted: acceptedPaymentClaim,
    product: acceptedPaymentClaim ? LAB_PRODUCT : null,
    labOnly: true,
  };
}
