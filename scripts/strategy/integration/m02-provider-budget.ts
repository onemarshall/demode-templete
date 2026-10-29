/** M02-specific guard around the shared local provider budget ledger/proxy. */
import { createM01ProviderBudget, FileM01BudgetLedger, startM01ProviderBudget, type M01BudgetConfig } from './m01-provider-budget.ts';

export const M02_LIVE_MODEL = 'inclusionai/ling-3.1-flash';
export const M02_LIVE_MAX_TOKENS = 12_000;
export const M02_LIVE_TIMEOUT_MS = 900_000;
export type M02BudgetConfig = M01BudgetConfig;

export function assertM02BudgetConfig(config: M02BudgetConfig) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(config.runName)) throw new Error('M02 budget requires a named run');
  if (!Number.isInteger(config.maxCalls) || config.maxCalls < 1 || config.maxCalls > 8) throw new Error('M02 budget is limited to 1 through 8 provider calls');
  if (config.model !== M02_LIVE_MODEL) throw new Error(`M02 live verification fixes the development model to ${M02_LIVE_MODEL}`);
  if (config.maxTokens !== M02_LIVE_MAX_TOKENS) throw new Error('M02 live verification fixes max tokens at 12000');
  if (config.timeoutMs !== M02_LIVE_TIMEOUT_MS) throw new Error('M02 live verification fixes timeout at 900000 ms');
  if (!config.apiKey || /[\r\n]/.test(config.apiKey)) throw new Error('M02 provider key is missing or invalid');
}

export function createM02ProviderBudget(config: M02BudgetConfig, options: Parameters<typeof createM01ProviderBudget>[1]) {
  assertM02BudgetConfig(config);
  return createM01ProviderBudget(config, options);
}

export async function startM02ProviderBudget(config: M02BudgetConfig, stateDir?: string) {
  assertM02BudgetConfig(config);
  // Reuses M01's durable, pre-request reservation ledger and loopback proxy.
  return startM01ProviderBudget(config, stateDir);
}

export { FileM01BudgetLedger as FileM02BudgetLedger };
