/**
 * Diagnostic engine client.
 *
 * Server-only. The engine is the production system; this client never contains
 * a diagnostic rule, prompt or score. It calls the controlled API and returns
 * typed data or a single `EngineError` the UI can map to a plain message.
 *
 * The engine token must never reach the browser. `DIAGNOSTIC_ENGINE_URL` and
 * `DIAGNOSTIC_ENGINE_TOKEN` are private server variables.
 */

import { getServerEnv } from '#lib/platform/config/server.server.js';

export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface EngineOptions {
  model: string | null;
  provider: string;
  providerConfigured: boolean;
  configurationError: string | null;
  scope: string;
  sectorIntelligence: Array<{ ref: string; name: string }>;
  families: string[];
  deliveryRoutes: string[];
  limits: { maxPages: number; maxReviewBatches: number; maxModelCalls: number };
}

export interface EngineIntakeView {
  jobId: string;
  status: string;
  stage: string;
  message: string;
  state?: Record<string, unknown>;
}

export interface EngineRunView {
  publicId: string;
  status: string;
  currentStage?: string | null;
  blockingFailure?: { code: string; summary: string } | null;
  reportFamily?: string;
  deliveryRoute?: string;
  reviewRequirement?: string;
  nextAction?: { action: string; detail: string } | null;
  [key: string]: unknown;
}

export interface EngineQualityReceipt {
  publicId: string;
  status: string;
  reportFamily: string;
  deliveryRoute: string;
  reviewRequirement: string;
  checks: Array<{ key: string; passed: boolean; detail: string }>;
  publication: { contentHash: string; outputPath: string; publishedAt: string } | null;
  sections: Array<{ key: string; heading: string; order: number }>;
}

export interface EnginePublication {
  publicId: string;
  contentHash: string;
  contentType: 'text/markdown';
  contentBase64: string;
  bytes: number;
  sections: Array<{ key: string; heading: string; order: number }>;
}

export interface EngineDecisionVersion {
  id: number;
  version: number;
  source: string;
  fields: Record<string, unknown>;
  rationale: string | null;
  contentHash: string;
  briefHash: string;
  createdBy: string;
  createdAt: string;
}

export interface EngineDecisionRecord {
  id: number;
  productionRunPublicId: string;
  route: string;
  status: string;
  currentVersion: EngineDecisionVersion;
  approvedVersion: EngineDecisionVersion | null;
  versions: Array<{
    version: number;
    source: string;
    contentHash: string;
    createdBy: string;
    createdAt: string;
  }>;
}

export interface EngineBrief {
  publicId: string;
  version: number;
  contentHash: string;
  briefHash: string;
  briefMd: string;
  approved: boolean;
}

async function configuration() {
	let url = process.env.DIAGNOSTIC_ENGINE_URL?.trim();
	let token = process.env.DIAGNOSTIC_ENGINE_TOKEN?.trim();
	let timeout = Number(process.env.DIAGNOSTIC_ENGINE_TIMEOUT_MS ?? 30_000);
	if (!url || !token) {
		try {
			const env = await getServerEnv();
			url ||= env.DIAGNOSTIC_ENGINE_URL;
			token ||= env.DIAGNOSTIC_ENGINE_TOKEN;
			timeout = Number(env.DIAGNOSTIC_ENGINE_TIMEOUT_MS ?? timeout);
		} catch {
			// The Node worker may not have the full application env schema.
		}
	}
	if (!url || !token)
		throw new EngineError(
			'unconfigured',
			'The diagnostic engine is not configured for this environment.',
			503
		);
	return { url, token, timeout };
}

export async function isEngineConfigured(): Promise<boolean> {
	if (process.env.DIAGNOSTIC_ENGINE_URL && process.env.DIAGNOSTIC_ENGINE_TOKEN)
		return true;
	try {
		const env = await getServerEnv();
		return Boolean(env.DIAGNOSTIC_ENGINE_URL && env.DIAGNOSTIC_ENGINE_TOKEN);
	} catch {
		return false;
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, token, timeout } = await configuration();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(new URL(path, url), {
      ...init,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'x-request-id': crypto.randomUUID(),
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {})
      },
      signal: controller.signal
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: unknown; error?: { code?: string; message?: string } }
      | null;
    if (!payload || typeof payload !== 'object')
      throw new EngineError(
        'invalid_response',
        'The diagnostic engine returned an unreadable response.',
        response.status
      );
    if (!response.ok || payload.ok !== true) {
      const error = payload.error ?? {};
      throw new EngineError(
        String(error.code ?? 'engine_error'),
        String(error.message ?? 'The diagnostic engine rejected the request.'),
        response.status
      );
    }
    return payload.data as T;
  } catch (error) {
    if (error instanceof EngineError) throw error;
    if ((error as Error).name === 'AbortError')
      throw new EngineError(
        'timeout',
        'The diagnostic engine did not respond in time.',
        504
      );
    throw new EngineError(
      'unreachable',
      'The diagnostic engine is unreachable.',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

export const getOptions = () => request<EngineOptions>('/v1/options');

export const createIntake = (body: unknown) =>
  request<EngineIntakeView>('/v1/intakes', {
    method: 'POST',
    body: JSON.stringify(body)
  });

export const getIntake = (jobId: string) =>
  request<EngineIntakeView>(`/v1/intakes/${encodeURIComponent(jobId)}`);

export const runIntakeAction = (
  jobId: string,
  action: string,
  extra: { notes?: string; decision?: string } = {}
) =>
  request<EngineIntakeView>(
    `/v1/intakes/${encodeURIComponent(jobId)}/actions`,
    { method: 'POST', body: JSON.stringify({ action, ...extra }) }
  );

export const getRun = (publicId: string) =>
  request<EngineRunView>(`/v1/runs/${encodeURIComponent(publicId)}`);

export const getQuality = (publicId: string) =>
  request<EngineQualityReceipt>(
    `/v1/runs/${encodeURIComponent(publicId)}/quality`
  );

export const getPublication = (publicId: string) =>
  request<EnginePublication>(
    `/v1/runs/${encodeURIComponent(publicId)}/publication`
  );

export const getDecisionRecord = (publicId: string) =>
  request<EngineDecisionRecord>(
    `/v1/runs/${encodeURIComponent(publicId)}/decision-record`
  );

export const generateDecisionRecord = (publicId: string) =>
  request<EngineDecisionRecord>(
    `/v1/runs/${encodeURIComponent(publicId)}/decision-record`,
    { method: 'POST' }
  );

export const applyDecisionDelta = (
  publicId: string,
  version: number,
  delta: unknown
) =>
  request<EngineDecisionRecord>(
    `/v1/runs/${encodeURIComponent(publicId)}/decision-record/${version}/delta`,
    { method: 'POST', body: JSON.stringify(delta) }
  );

export const approveDecisionVersion = (publicId: string, version: number) =>
  request<EngineDecisionRecord>(
    `/v1/runs/${encodeURIComponent(publicId)}/decision-record/${version}/approve`,
    { method: 'POST' }
  );

export const getBrief = (publicId: string) =>
  request<EngineBrief>(`/v1/runs/${encodeURIComponent(publicId)}/brief`);
