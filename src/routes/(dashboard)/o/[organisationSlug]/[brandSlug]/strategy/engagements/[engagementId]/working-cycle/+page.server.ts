import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { authStrategyM12Host } from '#lib/app/strategy-auth.server.js';
import { StrategyAccessError } from '#lib/modules/strategy/server/access.js';
import { StrategyNotFound } from '#lib/modules/strategy/server/data/repository.js';
export const load: PageServerLoad = async event => {
  try { return { initial: await authStrategyM12Host().read(event) }; }
  catch (cause) {
    if (cause instanceof StrategyAccessError) error(403, 'Strategy access denied');
    if (cause instanceof StrategyNotFound) error(404, 'Strategy resource not found');
    throw cause;
  }
};
