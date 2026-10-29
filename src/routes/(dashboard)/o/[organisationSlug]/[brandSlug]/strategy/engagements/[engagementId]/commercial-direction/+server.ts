import type { RequestHandler } from './$types';
import { authStrategyCDHost } from '#lib/app/strategy-auth.server.js';
import { strategyHttpError } from '#lib/app/strategy-host.server.js';
export const GET: RequestHandler = async event => {
  try { return await authStrategyCDHost().GET(event); }
  catch (cause) { return strategyHttpError(cause); }
};
export const POST: RequestHandler = async event => {
  try { return await authStrategyCDHost().POST(event); }
  catch (cause) { return strategyHttpError(cause); }
};
