/** Read-only verification for a completed M01 live run. No generation or seal commands are sent. */
import { chmod, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { Pool } from "pg";
import { request } from "@playwright/test";
import { readConnection, integrationState } from "./local-stack.ts";
import { outputsHash } from "../../../src/lib/modules/strategy/server/stages/m01/handoff.ts";

type Checkpoint = {
  version: 1;
  runName: string;
  organisationId?: string;
  brandId?: string;
  engagementId: string;
  sessionId?: string;
  base?: string;
  sourceVersionId?: string;
  sourceHash?: string;
  sealedVersionId?: string;
  approvedOutputsHash?: string;
  attestationId?: string;
  attestationHash?: string;
};

const runName = (() => {
  const args = process.argv.slice(2);
  const index = args.indexOf("--run");
  const name = index >= 0 ? args[index + 1] : undefined;
  if (args.length !== 2 || index !== 0 || !name || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(name))
    throw new Error("Usage: m01-live-verify --run <safe-run-name>");
  return name;
})();
const checkpointPath = join(integrationState, "m01-live", runName, "checkpoint.json");
const resultPath = join(integrationState, "m01-live", runName, "verify-result.json");
const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;
const canonicalJson = (value: any): string => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const digest = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const contentHash = (content: string) => createHash("sha256").update(content).digest("hex");
const sameJson = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right);

const connection = await readConnection();
const checkpoint = await readJson<Checkpoint>(checkpointPath);
const test = await readJson<any>(resolve(integrationState, "test.json"));
if (checkpoint.version !== 1 || checkpoint.runName !== runName ||
    !checkpoint.organisationId || !checkpoint.brandId || !checkpoint.engagementId ||
    !checkpoint.sessionId || !checkpoint.base || !checkpoint.sourceVersionId || !checkpoint.sourceHash ||
    !checkpoint.sealedVersionId || !checkpoint.approvedOutputsHash || !checkpoint.attestationId || !checkpoint.attestationHash) {
  throw new Error("M01 run checkpoint is incomplete or does not record a completed seal");
}
const app = new URL(test.appUrl);
const route = new URL(checkpoint.base, app);
if (!["http://127.0.0.1:5188", "http://localhost:5188"].includes(app.origin) ||
    route.origin !== app.origin || !route.pathname.includes(checkpoint.engagementId))
  throw new Error("M01 verification requires the checkpoint's guarded local Auth route");

const pool = new Pool({ connectionString: connection.databaseUrl, max: 3, connectionTimeoutMillis: 5000 });
const api = await request.newContext({ baseURL: app.origin, extraHTTPHeaders: { origin: app.origin, accept: "application/json" } });
const anonymous = await request.newContext({ baseURL: app.origin, extraHTTPHeaders: { accept: "application/json" } });
let assertions = 0;
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message); assertions++; };
const scope = [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId];
let initialJobCount = -1;

async function readSession() {
  const response = await api.get(`${checkpoint.base}?sessionId=${encodeURIComponent(checkpoint.sessionId!)}`);
  if (!response.ok()) throw new Error(`Authenticated sealed M01 read failed (${response.status()})`);
  return response.json();
}

try {
  const signIn = await api.post("/api/auth/sign-in/email", { data: { email: test.email, password: test.password } });
  check(signIn.ok(), "Synthetic test identity signed into local Auth");

  const beforeJobs = await pool.query(
    "SELECT count(*)::int AS count FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4",
    [...scope, checkpoint.sessionId],
  );
  initialJobCount = beforeJobs.rows[0].count;

  const anonymousRead = await anonymous.get(`${checkpoint.base}?sessionId=${encodeURIComponent(checkpoint.sessionId)}`);
  check([403, 404].includes(anonymousRead.status()), "Anonymous access to the sealed run is denied");
  const wrongEngagementBase = checkpoint.base.replace(checkpoint.engagementId, randomUUID());
  const crossScopeRead = await api.get(`${wrongEngagementBase}?sessionId=${encodeURIComponent(checkpoint.sessionId)}`);
  check([403, 404].includes(crossScopeRead.status()), "The sealed session cannot be read through another engagement route");

  const current = await readSession();
  const session = current.session;
  check(session?.sessionId === checkpoint.sessionId && current.stage === "sealed", "Authenticated API returned the checkpoint's M01 session");
  check(session?.seal?.versionId === checkpoint.sealedVersionId && !!session?.handoff, "API session remains sealed at the checkpointed version");
  check(current.source?.upstreamCurrent === true, "The sealed session still points to the current approved source");
  const sessionRow = (await pool.query("SELECT stage FROM strategy_session WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4", [...scope, checkpoint.sessionId])).rows[0];
  check(sessionRow?.stage === "m01", "SQL session retains its M01 module binding");
  const sealedRevision = Number(session.revision);
  check(Number.isInteger(sealedRevision) && sealedRevision > 0, "Sealed session has a valid committed revision");

  const versionResult = await pool.query(
    `SELECT id,session_id,revision,canonical_payload,seal_hash,hash_algorithm
     FROM strategy_version WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4`,
    [...scope, checkpoint.sealedVersionId],
  );
  const version = versionResult.rows[0];
  check(!!version && version.session_id === checkpoint.sessionId && Number(version.revision) === sealedRevision,
    "Immutable SQL version belongs to this session and exact seal revision");
  const canonicalOutputs = JSON.stringify(session.outputs);
  check(version.canonical_payload === canonicalOutputs, "SQL canonical payload preserves the exact sealed output JSON bytes");
  check(version.seal_hash === outputsHash(session.outputs), "SQL version hash matches the M01 outputs hash");
  check(version.seal_hash === session.seal.hash && version.hash_algorithm === "m01-outputs-json-sha256",
    "API seal and SQL version agree on the M01 output hash algorithm and digest");
  check(digest({ outputs: session.outputs?.outputs, factsAnchor: session.outputs?.factsAnchor?.items,
    publicRecordReadiness: session.outputs?.publicRecordReadiness, setTwoDraft: session.setTwoDraft }) === checkpoint.approvedOutputsHash,
  "Sealed content matches the separately approved output review hash");

  const sealRevisionResult = await pool.query(
    `SELECT revision,action,command_input,payload_text,created_at
     FROM strategy_revision WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5`,
    [...scope, checkpoint.sessionId, sealedRevision],
  );
  const sealRevision = sealRevisionResult.rows[0];
  check(!!sealRevision && sealRevision.action === "approve", "Seal is committed as an immutable approval revision");
  const sealCommand = typeof sealRevision.command_input === "string" ? JSON.parse(sealRevision.command_input) : sealRevision.command_input;
  check(sealCommand?.operation === "seal" && sealCommand?.sourceAttributionId === checkpoint.attestationId,
    "Committed seal command references the checkpointed attribution ID");
  check(sameJson(JSON.parse(sealRevision.payload_text), session), "API session equals the exact committed seal revision payload");

  const source = (await pool.query(
    `SELECT h.version_id,v.seal_hash FROM strategy_source_head h
     JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id
     WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot='m01-input'`, scope,
  )).rows[0];
  check(!!source && source.version_id === checkpoint.sourceVersionId && source.seal_hash === checkpoint.sourceHash,
    "The run's pinned M01 source remains the current source version and hash");
  const sourceRef = (await pool.query(
    `SELECT version_id,expected_hash FROM strategy_source_ref
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5 AND slot='m01-input'`,
    [...scope, checkpoint.sessionId, sealedRevision],
  )).rows[0];
  check(!!sourceRef && sourceRef.version_id === checkpoint.sourceVersionId && sourceRef.expected_hash === checkpoint.sourceHash,
    "Seal revision records its exact source version and hash reference");

  const attribution = (await pool.query(
    `SELECT a.id,a.source_version_id,a.source_hash,a.source_type,a.source_name,a.material_used,a.evidence_refs,a.attestation_statement,a.attested_by,r.revoked_at
     FROM strategy_m01_source_attribution a
     LEFT JOIN strategy_m01_source_attribution_revocation r ON r.organisation_id=a.organisation_id AND r.brand_id=a.brand_id AND r.engagement_id=a.engagement_id AND r.attribution_id=a.id
     WHERE a.organisation_id=$1 AND a.brand_id=$2 AND a.engagement_id=$3 AND a.id=$4`,
    [...scope, checkpoint.attestationId],
  )).rows[0];
  check(!!attribution && attribution.source_version_id === checkpoint.sourceVersionId && attribution.source_hash === checkpoint.sourceHash,
    "Source attribution is pinned to the exact source version and hash");
  check(!!attribution && digest({ type: attribution.source_type, name: attribution.source_name,
    materialUsed: attribution.material_used, evidenceRefs: attribution.evidence_refs, statement: attribution.attestation_statement }) === checkpoint.attestationHash,
  "Persisted source attribution matches its checkpointed attestation digest");
  const use = (await pool.query(
    `SELECT attribution_id,actor_id FROM strategy_m01_source_attribution_use
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5`,
    [...scope, checkpoint.sessionId, sealedRevision],
  )).rows[0];
  check(!!use && use.attribution_id === checkpoint.attestationId, "Immutable seal usage row links the seal revision to its source attribution");

  const approval = (await pool.query(
    `SELECT version_id,actor_id,declaration FROM strategy_approval
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND version_id=$4`,
    [...scope, checkpoint.sealedVersionId],
  )).rows[0];
  check(!!approval && approval.version_id === checkpoint.sealedVersionId && sameJson(approval.declaration, session.handoff),
    "Immutable approval row contains the exact sealed handoff declaration");
  check(!!use && !!approval && use.actor_id === approval.actor_id, "Attribution use and approval were committed by the same seal actor");

  const documentRows = (await pool.query(
    `SELECT id,version_id,kind,content,hash FROM strategy_document
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND version_id=$4 ORDER BY kind`,
    [...scope, checkpoint.sealedVersionId],
  )).rows;
  const byKind = new Map(documentRows.map((row: any) => [row.kind, row]));
  check(documentRows.length === 3 && ["founder-convictions", "method-provenance", "receipt"].every((kind) => byKind.has(kind)),
    "All three immutable documents were created for the sealed version");
  for (const doc of documentRows) {
    check(contentHash(doc.content) === doc.hash, `Stored ${doc.kind} content matches its SHA-256 document hash`);
    const directusUrl = new URL("/items/strategy_document", connection.directusUrl);
    directusUrl.searchParams.set("filter[id][_eq]", doc.id);
    directusUrl.searchParams.set("fields", "id,version_id,kind,content,hash");
    directusUrl.searchParams.set("limit", "1");
    const directusResponse = await fetch(directusUrl, {
      headers: { authorization: `Bearer ${connection.readerToken}`, accept: "application/json" },
      redirect: "error",
      cache: "no-store",
    });
    check(directusResponse.ok, `Read-only Directus API can read ${doc.kind}`);
    const rows = (await directusResponse.json() as any)?.data;
    const directusDoc = Array.isArray(rows) ? rows[0] : null;
    check(!!directusDoc && directusDoc.id === doc.id && String(directusDoc.version_id) === doc.version_id &&
      directusDoc.kind === doc.kind && directusDoc.content === doc.content && directusDoc.hash === doc.hash,
    `Directus ${doc.kind} bytes, hash, and version match SQL exactly`);
  }

  const apiDocs = new Map((current.documents ?? []).map((doc: any) => [doc.kind, doc]));
  for (const kind of ["founder-convictions", "receipt"]) {
    const sqlDoc: any = byKind.get(kind);
    const apiDoc: any = apiDocs.get(kind);
    check(!!apiDoc && apiDoc.id === sqlDoc.id && apiDoc.versionId === sqlDoc.version_id && apiDoc.hash === sqlDoc.hash,
      `Authenticated API exposes the exact ${kind} document identity`);
    check(apiDoc.content === sqlDoc.content, `Authenticated API ${kind} content exactly matches SQL`);
    const exportResponse = await api.get(`${checkpoint.base}/handoff?sessionId=${encodeURIComponent(checkpoint.sessionId)}&versionId=${encodeURIComponent(checkpoint.sealedVersionId)}&documentId=${encodeURIComponent(sqlDoc.id)}`);
    check(exportResponse.ok(), `Authenticated ${kind} handoff export succeeds`);
    check(await exportResponse.text() === sqlDoc.content, `Handoff ${kind} export exactly matches stored content bytes`);
    const contentType = exportResponse.headers()["content-type"] ?? "";
    check(kind === "receipt" ? contentType.includes("application/json") : contentType.includes("text/markdown"),
      `Handoff ${kind} export uses the expected content type`);
  }
  const receipt = JSON.parse((byKind.get("receipt") as any).content);
  check(sameJson(receipt, session.handoff), "Receipt JSON is the exact serialized handoff declaration");
  check((byKind.get("founder-convictions") as any).content.startsWith("# Founder Convictions"),
    "Markdown handoff is a Founder Convictions document");

  const immutableTables = ["strategy_revision", "strategy_version", "strategy_source_ref", "strategy_document",
    "strategy_approval", "strategy_fork_command", "strategy_m01_source_attribution",
    "strategy_m01_source_attribution_use"];
  const triggerRows = (await pool.query(
    `SELECT c.relname AS table_name,t.tgname,t.tgenabled
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=current_schema() AND NOT t.tgisinternal AND c.relname=ANY($1::text[])`,
    [immutableTables],
  )).rows;
  const triggerNames = new Set(triggerRows.filter((row: any) => row.tgenabled !== "D").map((row: any) => row.tgname));
  check(["strategy_revision_immutable", "strategy_version_immutable", "strategy_source_ref_immutable",
    "strategy_document_immutable", "strategy_approval_immutable", "strategy_fork_command_immutable",
    "strategy_m01_source_attribution_immutable", "strategy_m01_source_attribution_use_immutable"].every((name) => triggerNames.has(name)),
  "Database has enabled immutability guards for approvals, documents, source attribution, and historical records");

  const afterJobs = await pool.query(
    "SELECT count(*)::int AS count FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4",
    [...scope, checkpoint.sessionId],
  );
  check(afterJobs.rows[0].count === initialJobCount, "Read-only verification created no generation jobs");
  const laterJobs = await pool.query(
    `SELECT count(*)::int AS count FROM strategy_job j JOIN strategy_revision r
       ON r.organisation_id=j.organisation_id AND r.brand_id=j.brand_id AND r.engagement_id=j.engagement_id
       AND r.session_id=j.session_id AND r.revision=j.input_revision
     WHERE j.organisation_id=$1 AND j.brand_id=$2 AND j.engagement_id=$3 AND j.session_id=$4 AND j.created_at>$5`,
    [...scope, checkpoint.sessionId, sealRevision.created_at],
  );
  check(laterJobs.rows[0].count === 0, "No generation job was created after the sealed revision");

  const result = {
    passed: true,
    syntheticRun: runName,
    sessionId: checkpoint.sessionId,
    versionId: checkpoint.sealedVersionId,
    assertions,
    readOnly: true,
    generationJobsCreated: 0,
    at: new Date().toISOString(),
  };
  await writeFile(resultPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  await chmod(resultPath, 0o600);
  console.log(`PASS: ${assertions} read-only M01 live seal verification assertions.`);
} finally {
  await anonymous.dispose();
  await api.dispose();
  await pool.end();
}
