/** Synthetic product and test-mode processor only. No live payment or fulfillment. */
export const LAB_AMOUNT_MINOR = 19900; // EUR 199.00 TEST nominal value.
export const LAB_CURRENCY = 'eur';
export const LAB_PRODUCT = 'Q03A_SYNTHETIC_DIGITAL_ENTITLEMENT';

export function eventClaimsSuccessfulPayment(event: unknown, expectedIntentId: string): boolean {
  if (!event || typeof event !== 'object') return false;
  const value = event as { type?: unknown; data?: { object?: { id?: unknown } } };
  return value.type === 'payment_intent.succeeded' &&
    typeof value.data?.object?.id === 'string' &&
    value.data.object.id === expectedIntentId;
}

/** Separate, real Stripe TEST API response provides this oracle, not the webhook event. */
export function evaluateProviderProof(
  intent: { id?: unknown; amount?: unknown; amount_received?: unknown; currency?: unknown; status?: unknown; livemode?: unknown },
  expectedIntentId: string,
  entitlementGranted: boolean
) {
  if (!intent || intent.livemode !== false) throw Error('STRIPE_TEST_MODE_REQUIRED');
  if (intent.id !== expectedIntentId || intent.currency !== LAB_CURRENCY || intent.amount !== LAB_AMOUNT_MINOR ||
      !Number.isSafeInteger(intent.amount_received) || (intent.amount_received as number) < 0)
    throw Error('STRIPE_INTENT_OR_AMOUNT_MISMATCH');

  const received = intent.amount_received as number;
  const providerActuallyPaid = intent.status === 'succeeded' && received >= LAB_AMOUNT_MINOR;
  return {
    provider: 'stripe_test_mode',
    processorPaymentStatus: intent.status,
    currency: LAB_CURRENCY,
    invoiceAmountMinor: LAB_AMOUNT_MINOR,
    processorReceivedMinor: received,
    entitlementGranted,
    // Real economic loss is NOT proven by a simulated test-mode order.
    uncollectedNominalValueMinor: entitlementGranted && !providerActuallyPaid ? LAB_AMOUNT_MINOR - Math.min(received, LAB_AMOUNT_MINOR) : 0,
    liveFinancialLossMinor: 0,
    referenceSecureFulfillmentWouldGrant: providerActuallyPaid,
    isTestMode: true,
  };
}
