import type {RequestHandler} from './$types';
import {authStrategyM01Host} from '#lib/app/strategy-auth.server.js';
import {strategyHttpError} from '#lib/app/strategy-host.server.js';
export const GET:RequestHandler=async event=>{try{return await authStrategyM01Host().GET(event)}catch(error){return strategyHttpError(error)}};
export const POST:RequestHandler=async event=>{try{return await authStrategyM01Host().POST(event)}catch(error){return strategyHttpError(error)}};
