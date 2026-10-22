import { getRun } from 'workflow/api';

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  if (!/^wrun_[A-Za-z0-9_-]{8,100}$/.test(runId)) return Response.json({ error: 'bad_run_id' }, { status: 400 });
  try {
    const run = getRun(runId);
    const status = await run.status;
    return Response.json({ runId, status, ...(status === 'completed' ? { result: await run.returnValue } : {}) });
  } catch (error) {
    return Response.json({ runId, error: String(error) }, { status: 500 });
  }
}
