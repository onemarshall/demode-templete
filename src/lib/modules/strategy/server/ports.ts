import type { StrategyScope } from "./access";
export interface StrategySession<T = unknown> {
  id: string;
  stage: string;
  revision: number;
  payload: T;
}
export interface StrategyVersion {
  id: string;
  canonicalPayload: string;
  sealHash: string;
  hashAlgorithm: string;
}
export interface StrategyDocument {
  id: string;
  versionId: string;
  kind: string;
  content: string;
  hash: string;
}
export interface StrategySource {
  slot: string;
  versionId: string;
  expectedHash: string;
}
export interface StrategyMutation<T> {
  payload: T;
  version?: StrategyVersion;
  documents?: StrategyDocument[];
  approval?: { versionId: string; declaration: unknown };
  sources?: StrategySource[];
  outbox?: { kind: string; payload: unknown }[];
}
export interface StrategyStore {
  getSession<T>(scope: StrategyScope, id: string): Promise<StrategySession<T> | null>;
  createSession<T>(
    scope: StrategyScope,
    input: { id: string; stage: string; payload: T },
  ): Promise<StrategySession<T>>;
  mutateSession<T>(
    scope: StrategyScope,
    id: string,
    expectedRevision: number,
    commandId: string,
    update: (current: StrategySession<T>) => StrategyMutation<T> | Promise<StrategyMutation<T>>,
  ): Promise<StrategySession<T>>;
}
