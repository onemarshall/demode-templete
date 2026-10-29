import type { RequestHandler } from './$types';
import { authStrategyBFHost } from '#lib/app/strategy-auth.server.js';
import { strategyHttpError } from '#lib/app/strategy-host.server.js';
export const GET: RequestHandler = async event => {
  try { return await authStrategyBFHost().handoff(event); }
  catch (cause) { return strategyHttpError(cause); }
};
