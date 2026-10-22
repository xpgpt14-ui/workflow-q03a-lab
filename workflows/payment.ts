import { createWebhook } from 'workflow';

/** LAB ONLY. No external vendors, transactions, payment processing, or network side effects. */
export async function paymentWorkflow() {
  'use workflow';
  const webhook = createWebhook();
  const request = await webhook;
  const payload = await request.json();
  return {
    status: payload.status ?? null,
    forged: payload.forged === true,
    offset: Number.isInteger(payload.offset) ? payload.offset : null,
  };
}
