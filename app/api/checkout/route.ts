import { start } from 'workflow/api';
import { paymentWorkflow } from '../../../workflows/payment';

export async function POST() {
  const run = await start(paymentWorkflow);
  return Response.json({ runId: run.runId }, { status: 201 });
}
