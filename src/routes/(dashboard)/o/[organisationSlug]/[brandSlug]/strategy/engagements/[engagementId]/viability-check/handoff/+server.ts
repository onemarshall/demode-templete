import type {RequestHandler} from './$types';
import {authStrategyHost} from '#lib/app/strategy-auth.server.js';
import {strategyHttpError} from '#lib/app/strategy-host.server.js';
export const GET:RequestHandler=async event=>{try{return await authStrategyHost().handoff(event);}catch(cause){return strategyHttpError(cause);}};
