import type { RequestHandler } from './$types';
import { authStrategyM07Host } from '#lib/app/strategy-auth.server.js';
import { strategyHttpError } from '#lib/app/strategy-host.server.js';
export const GET: RequestHandler = async event => {
  try { return await authStrategyM07Host().handoff(event); }
  catch (cause) { return strategyHttpError(cause); }
};
