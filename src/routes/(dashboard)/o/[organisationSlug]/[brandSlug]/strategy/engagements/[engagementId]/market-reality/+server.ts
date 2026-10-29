import type { RequestHandler } from './$types';
import { authStrategyM02Host } from '#lib/app/strategy-auth.server.js';
import { strategyHttpError } from '#lib/app/strategy-host.server.js';
export const GET: RequestHandler = async event => {
  try { return await authStrategyM02Host().GET(event); }
  catch (cause) { return strategyHttpError(cause); }
};
export const POST: RequestHandler = async event => {
  try { return await authStrategyM02Host().POST(event); }
  catch (cause) { return strategyHttpError(cause); }
};
