import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  assertStrategyPublication,
  assertStrategyWorkerMutation,
  type StrategyScope,
  type AuthorityQuery,
} from "../access";
import type { StrategySession, StrategyMutation, StrategyStore } from "../ports";

export class StrategyConflict extends Error {
  constructor(public readonly currentRevision: number) {
    super("Strategy revision conflict");
  }
}
export class StrategyNotFound extends Error {
  constructor() {
    super("Strategy resource not found");
  }
}
export interface SourceRecord {
  id: string;
  slot: string;
  body: unknown;
  hash: string;
}
export interface MutationContext extends AuthorityQuery {
  getSource(slot: string): Promise<SourceRecord | null>;
  assertJobLease(jobId: string, fence: number): Promise<void>;
}
export type AtomicMutation<T> = StrategyMutation<T> & {
  successors?: { id: string; stage: string; payload: unknown }[];
};
const ownership = (s: StrategyScope) => [s.organisationId, s.brandId, s.engagementId];
const where = "organisation_id=$1 AND brand_id=$2 AND engagement_id=$3";
/** All writes take the engagement lock first. This serializes source-head changes with
 * session CAS and pins, including writes from independently deployed worker pools.
 * External providers must finish before entering a mutation callback.
 */
export class StrategyRepository implements StrategyStore {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(
    scope: StrategyScope,
    work: (db: PoolClient) => Promise<T>,
  ): Promise<T> {
    assertStrategyScope(scope);
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await recheckStrategyScope(scope, db);
      const lock = await db.query(
        `SELECT id FROM strategy_engagement WHERE organisation_id=$1 AND brand_id=$2 AND id=$3 FOR UPDATE`,
        ownership(scope),
      );
      if (!lock.rowCount) throw new StrategyNotFound();
      const result = await work(db);
      await recheckStrategyScope(scope, db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }
  async createEngagement(
    scope: StrategyScope,
    input: { id: string; label: string },
  ): Promise<void> {
    assertStrategyScope(scope, ["manage"]);
    if (input.id !== scope.engagementId) throw new StrategyNotFound();
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await recheckStrategyScope(scope, db);
      // Only an explicitly authorised host manager may establish the standalone binding.
      await db.query(
        "INSERT INTO strategy_brand_binding VALUES($1,$2) ON CONFLICT DO NOTHING",
        ownership(scope).slice(0, 2),
      );
      await db.query(
        "INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,$4,$5)",
        [...ownership(scope), input.label, scope.actorId],
      );
      await recheckStrategyScope(scope, db);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }
  private async readSession<T>(
    db: Pick<Pool, "query"> | PoolClient,
    scope: StrategyScope,
    id: string,
  ): Promise<StrategySession<T> | null> {
    const { rows } = await db.query(
      `SELECT s.id,s.stage,s.revision,r.payload_text FROM strategy_session s JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.id=$4`,
      [...ownership(scope), id],
    );
    return rows[0]
      ? {
          id: rows[0].id,
          stage: rows[0].stage,
          revision: rows[0].revision,
          payload: JSON.parse(rows[0].payload_text),
        }
      : null;
  }
  async getSession<T>(scope: StrategyScope, id: string): Promise<StrategySession<T> | null> {
    return this.transaction(scope, (db) => this.readSession<T>(db, scope, id));
  }
  async listSessions<T>(scope: StrategyScope, stage?: string): Promise<StrategySession<T>[]> {
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT s.id,s.stage,s.revision,r.payload_text FROM strategy_session s JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND ($4::text IS NULL OR s.stage=$4) ORDER BY s.id`,
        [...ownership(scope), stage ?? null],
      );
      return rows.map((row) => ({
        id: row.id,
        stage: row.stage,
        revision: row.revision,
        payload: JSON.parse(row.payload_text),
      }));
    });
  }
  private async insertSession<T>(
    db: PoolClient,
    scope: StrategyScope,
    input: { id: string; stage: string; payload: T },
  ): Promise<StrategySession<T>> {
    await db.query(
      "INSERT INTO strategy_session(organisation_id,brand_id,engagement_id,id,stage,revision) VALUES($1,$2,$3,$4,$5,1)",
      [...ownership(scope), input.id, input.stage],
    );
    await db.query(
      "INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES($1,$2,$3,$4,1,$5,$6,$7,$8,$9::text::jsonb,$9::text)",
      [
        ...ownership(scope),
        input.id,
        `create:${input.id}`,
        scope.actorId,
        scope.action,
        JSON.stringify(input),
        JSON.stringify(input.payload),
      ],
    );
    return { ...input, revision: 1 };
  }
  async createSession<T>(
    scope: StrategyScope,
    input: { id: string; stage: string; payload: T },
  ): Promise<StrategySession<T>> {
    assertStrategyScope(scope, ["edit", "manage"]);
    return this.transaction(scope, (db) => this.insertSession(db, scope, input));
  }
  async createSessionWithSource<T>(
    scope: StrategyScope,
    initializer:
      | { id: string; stage: string; payload: T }
      | ((source: SourceRecord) => { id: string; stage: string; payload: T }),
    slot: string,
    verify: (source: SourceRecord) => void,
    options?: { commandId: string; commandInput: unknown },
  ): Promise<StrategySession<T>> {
    assertStrategyScope(scope, ["edit", "manage"]);
    return this.transaction(scope, async (db) => {
      if (options) {
        if (!options.commandId.trim()) throw new Error("Command ID required");
        const prior = await db.query(
          `SELECT session_id,actor_id,action,command_input FROM strategy_create_command WHERE ${where} AND command_id=$4`,
          [...ownership(scope), options.commandId],
        );
        if (prior.rows[0]) {
          const command = prior.rows[0];
          if (
            command.actor_id !== scope.actorId ||
            command.action !== scope.action ||
            command.command_input !== JSON.stringify(options.commandInput)
          )
            throw new Error("Idempotency key reused for a different command");
          return (await this.readSession<T>(db, scope, command.session_id))!;
        }
      }
      const source = await this.readSource(db, scope, slot);
      if (!source) throw new StrategyNotFound();
      verify(source);
      const input = typeof initializer === "function" ? initializer(source) : initializer;
      const session = await this.insertSession(db, scope, input);
      await db.query("INSERT INTO strategy_source_ref VALUES($1,$2,$3,$4,1,$5,$6,$7)", [
        ...ownership(scope),
        input.id,
        slot,
        source.id,
        source.hash,
      ]);
      if (options)
        await db.query(
          "INSERT INTO strategy_create_command(organisation_id,brand_id,engagement_id,command_id,actor_id,action,command_input,session_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            ...ownership(scope),
            options.commandId,
            scope.actorId,
            scope.action,
            JSON.stringify(options.commandInput),
            session.id,
          ],
        );
      return session;
    });
  }
  async forkSession<T>(
    scope: StrategyScope,
    parentId: string,
    expectedRevision: number,
    commandId: string,
    initialize: (
      current: StrategySession<T>,
      tx: MutationContext,
    ) =>
      | {
          successor: { id: string; stage: string; payload: T };
          outbox?: { kind: string; payload: unknown }[];
        }
      | Promise<{
          successor: { id: string; stage: string; payload: T };
          outbox?: { kind: string; payload: unknown }[];
        }>,
    commandInput: unknown = null,
  ): Promise<StrategySession<T>> {
    assertStrategyScope(scope, ["edit", "manage"]);
    if (!commandId.trim()) throw new Error("Command ID required");
    return this.transaction(scope, async (db) => {
      const current = await this.readSession<T>(db, scope, parentId);
      if (!current) throw new StrategyNotFound();
      const duplicate = await db.query(
        `SELECT successor_id,actor_id,action,command_input FROM strategy_fork_command WHERE ${where} AND parent_id=$4 AND command_id=$5`,
        [...ownership(scope), parentId, commandId],
      );
      if (duplicate.rows[0]) {
        const prior = duplicate.rows[0];
        if (
          prior.actor_id !== scope.actorId ||
          prior.action !== scope.action ||
          prior.command_input !== JSON.stringify(commandInput)
        )
          throw new Error("Idempotency key reused for a different command");
        return (await this.readSession<T>(db, scope, prior.successor_id))!;
      }
      if (current.revision !== expectedRevision) throw new StrategyConflict(current.revision);
      const result = await initialize(structuredClone(current), {
        getSource: (slot) => this.readSource(db, scope, slot),
        query: (text, values) => db.query(text, values),
        assertJobLease: async () => {
          throw new Error("Jobs cannot fork sealed sessions");
        },
      });
      const successor = await this.insertSession(db, scope, result.successor);
      await db.query(
        "INSERT INTO strategy_fork_command(organisation_id,brand_id,engagement_id,parent_id,command_id,successor_id,actor_id,action,command_input) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          ...ownership(scope),
          parentId,
          commandId,
          successor.id,
          scope.actorId,
          scope.action,
          JSON.stringify(commandInput),
        ],
      );
      for (const event of result.outbox ?? [])
        await db.query(
          "INSERT INTO strategy_outbox(organisation_id,brand_id,engagement_id,session_id,revision,kind,payload) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [...ownership(scope), successor.id, 1, event.kind, JSON.stringify(event.payload)],
        );
      return successor;
    });
  }
  private async readSource(
    db: PoolClient,
    scope: StrategyScope,
    slot: string,
  ): Promise<SourceRecord | null> {
    const { rows } = await db.query(
      `SELECT v.id,h.slot,v.canonical_payload,v.seal_hash FROM strategy_source_head h JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,
      [...ownership(scope), slot],
    );
    return rows[0]
      ? {
          id: rows[0].id,
          slot: rows[0].slot,
          body: JSON.parse(rows[0].canonical_payload),
          hash: rows[0].seal_hash,
        }
      : null;
  }
  async getSource(scope: StrategyScope, slot: string): Promise<SourceRecord | null> {
    return this.transaction(scope, (db) => this.readSource(db, scope, slot));
  }
  /** Host import boundary only: callers must verify the legacy seal before supplying
   * its exact canonical bytes. This API never recomputes/replaces historical hashes.
   */
  async setSource(
    scope: StrategyScope,
    input: {
      id: string;
      slot: string;
      body: unknown;
      hash: string;
      canonicalPayload?: string;
      hashAlgorithm?: string;
    },
  ): Promise<void> {
    assertStrategyScope(scope, ["manage"]);
    await this.transaction(scope, async (db) => {
      const bytes = input.canonicalPayload ?? JSON.stringify(input.body);
      if (JSON.stringify(JSON.parse(bytes)) !== JSON.stringify(input.body))
        throw new Error("Source bytes do not match body");
      await db.query(
        "INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [...ownership(scope), input.id, bytes, input.hash, input.hashAlgorithm ?? "legacy"],
      );
      await db.query(
        "INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id",
        [...ownership(scope), input.slot, input.id],
      );
    });
  }
  async mutateSession<T>(
    scope: StrategyScope,
    id: string,
    expectedRevision: number,
    commandId: string,
    update: (
      current: StrategySession<T>,
      tx: MutationContext,
    ) => AtomicMutation<T> | Promise<AtomicMutation<T>>,
    commandInput: unknown = null,
  ): Promise<StrategySession<T>> {
    assertStrategyScope(scope, ["edit", "approve", "generate", "manage"]);
    if (!commandId.trim()) throw new Error("Command ID required");
    return this.transaction(scope, async (db) => {
      const current = await this.readSession<T>(db, scope, id);
      if (!current) throw new StrategyNotFound();
      const duplicate = await db.query(
        `SELECT revision,payload_text,actor_id,action,command_input FROM strategy_revision WHERE ${where} AND session_id=$4 AND command_id=$5`,
        [...ownership(scope), id, commandId],
      );
      if (duplicate.rows[0]) {
        const prior = duplicate.rows[0];
        if (
          prior.actor_id !== scope.actorId ||
          prior.action !== scope.action ||
          prior.command_input !== JSON.stringify(commandInput)
        )
          throw new Error("Idempotency key reused for a different command");
        return {
          id,
          stage: current.stage,
          revision: prior.revision,
          payload: JSON.parse(prior.payload_text),
        };
      }
      if (current.revision !== expectedRevision) throw new StrategyConflict(current.revision);
      let publicationLease: { jobId: string; fence: number } | undefined;
      const mutation = await update(structuredClone(current), {
        getSource: (slot) => this.readSource(db, scope, slot),
        query: (text, values) => db.query(text, values),
        assertJobLease: async (jobId, fence) => {
          assertStrategyScope(scope, ["generate"]);
          const lease = await db.query(
            `SELECT pins_text FROM strategy_job WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$6 AND session_id=$7 AND input_revision=$8 AND command_id=$9 AND status='running' AND lease_until>clock_timestamp() FOR UPDATE`,
            [...ownership(scope), jobId, fence, scope.actorId, id, expectedRevision, commandId],
          );
          if (!lease.rows[0]) throw new Error("Strategy job lease lost");
          for (const pin of JSON.parse(lease.rows[0].pins_text) as {
            slot: string;
            versionId: string;
            hash: string;
          }[]) {
            const source = await this.readSource(db, scope, pin.slot);
            if (!source || source.id !== pin.versionId || source.hash !== pin.hash)
              throw new Error("Strategy job source changed");
          }
          assertStrategyPublication(scope, { jobId, fence });
          publicationLease = { jobId, fence };
        },
      });
      assertStrategyWorkerMutation(scope, publicationLease);
      if (mutation.version || mutation.approval) assertStrategyScope(scope, ["approve"]);
      if (mutation.approval && mutation.approval.versionId !== mutation.version?.id)
        throw new Error("Approval must seal the version in this mutation");
      if (mutation.documents?.some((document) => document.versionId !== mutation.version?.id))
        throw new Error("Documents must belong to the version in this mutation");
      const revision = current.revision + 1;
      await db.query(
        "INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text::jsonb,$10::text)",
        [
          ...ownership(scope),
          id,
          revision,
          commandId,
          scope.actorId,
          scope.action,
          JSON.stringify(commandInput),
          JSON.stringify(mutation.payload),
        ],
      );
      if (mutation.version) {
        const v = mutation.version;
        await db.query(
          "INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,session_id,revision,canonical_payload,seal_hash,hash_algorithm) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            ...ownership(scope),
            v.id,
            id,
            revision,
            v.canonicalPayload,
            v.sealHash,
            v.hashAlgorithm,
          ],
        );
      }
      for (const source of mutation.sources ?? []) {
        const live = await this.readSource(db, scope, source.slot);
        if (!live || live.id !== source.versionId || live.hash !== source.expectedHash)
          throw new Error("Strategy source changed");
        await db.query("INSERT INTO strategy_source_ref VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [
          ...ownership(scope),
          id,
          revision,
          source.slot,
          source.versionId,
          source.expectedHash,
        ]);
      }
      for (const d of mutation.documents ?? [])
        await db.query("INSERT INTO strategy_document VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [
          ...ownership(scope),
          d.id,
          d.versionId,
          d.kind,
          d.content,
          d.hash,
        ]);
      if (mutation.approval) {
        const a = mutation.approval;
        await db.query(
          "INSERT INTO strategy_approval(organisation_id,brand_id,engagement_id,version_id,actor_id,declaration) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
          [...ownership(scope), a.versionId, scope.actorId, JSON.stringify(a.declaration)],
        );
      }
      for (const successor of mutation.successors ?? [])
        await this.insertSession(db, scope, successor);
      for (const event of mutation.outbox ?? [])
        await db.query(
          "INSERT INTO strategy_outbox(organisation_id,brand_id,engagement_id,session_id,revision,kind,payload) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [...ownership(scope), id, revision, event.kind, JSON.stringify(event.payload)],
        );
      await db.query(`UPDATE strategy_session SET revision=$5 WHERE ${where} AND id=$4`, [
        ...ownership(scope),
        id,
        revision,
      ]);
      if (publicationLease) {
        const committed = await db.query(
          `UPDATE strategy_job SET status='succeeded',result_text=$6,lease_until=NULL,updated_at=now() WHERE ${where} AND id=$4 AND fence=$5 AND status='running' AND lease_until>clock_timestamp()`,
          [
            ...ownership(scope),
            publicationLease.jobId,
            publicationLease.fence,
            JSON.stringify({ id, stage: current.stage, revision, payload: mutation.payload }),
          ],
        );
        if (!committed.rowCount) throw new Error("Strategy job lease lost");
      }
      return { id, stage: current.stage, revision, payload: mutation.payload };
    });
  }
  async getVersion(
    scope: StrategyScope,
    id: string,
  ): Promise<{ canonicalPayload: string; sealHash: string; hashAlgorithm: string } | null> {
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT canonical_payload AS "canonicalPayload",seal_hash AS "sealHash",hash_algorithm AS "hashAlgorithm" FROM strategy_version WHERE ${where} AND id=$4`,
        [...ownership(scope), id],
      );
      return rows[0] ?? null;
    });
  }
  async listDocuments(
    scope: StrategyScope,
    sessionId: string,
  ): Promise<{ id: string; versionId: string; kind: string; hash: string }[]> {
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT d.id,d.version_id AS "versionId",d.kind,d.hash FROM strategy_document d JOIN strategy_version v ON v.organisation_id=d.organisation_id AND v.brand_id=d.brand_id AND v.engagement_id=d.engagement_id AND v.id=d.version_id WHERE d.organisation_id=$1 AND d.brand_id=$2 AND d.engagement_id=$3 AND v.session_id=$4 ORDER BY d.id`,
        [...ownership(scope), sessionId],
      );
      return rows;
    });
  }
  async getDocument(
    scope: StrategyScope,
    id: string,
  ): Promise<{
    content: string;
    hash: string;
    versionId: string;
    sessionId: string;
    kind: string;
  } | null> {
    assertStrategyScope(scope, ["export"]);
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT d.content,d.hash,d.version_id AS "versionId",v.session_id AS "sessionId",d.kind FROM strategy_document d JOIN strategy_version v ON v.organisation_id=d.organisation_id AND v.brand_id=d.brand_id AND v.engagement_id=d.engagement_id AND v.id=d.version_id WHERE d.organisation_id=$1 AND d.brand_id=$2 AND d.engagement_id=$3 AND d.id=$4`,
        [...ownership(scope), id],
      );
      return rows[0] ?? null;
    });
  }
}
