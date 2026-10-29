import {z} from 'zod';
import {ANCHOR_KEYS} from './synthesis';
import {SourceType} from './handoff';
const base=z.object({sessionId:z.uuid(),expectedRevision:z.number().int().positive(),commandId:z.string().trim().min(1).max(200)});
const eventSchema=z.object({event_id:z.string().min(1).max(200),type:z.enum(['session.input_transcript.delta','session.output_transcript.delta']),delta:z.string().min(1).max(64000),start_ms:z.number().nonnegative().optional(),end_ms:z.number().nonnegative().optional()}).strict();
export const m01CommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),commandId:z.string().trim().min(1).max(200)}).strict(),
 base.extend({action:z.enum(['prepare','synthesise','derive'])}).strict(),
 base.extend({action:z.literal('turn'),message:z.string().trim().min(1).max(16000).nullable()}).strict(),
 base.extend({action:z.literal('note'),note:z.string().max(64000)}).strict(),
 base.extend({action:z.literal('append-events'),events:z.array(eventSchema).min(1).max(500)}).strict(),
 base.extend({action:z.literal('revise-anchor'),anchorKey:z.enum(ANCHOR_KEYS),note:z.string().trim().min(1).max(16000)}).strict(),
 base.extend({action:z.enum(['revise-manifesto','revise-matrix']),note:z.string().trim().min(1).max(16000)}).strict(),
 base.extend({action:z.literal('confirm'),part:z.enum(['anchor','anchors','manifesto','languageBank','evidenceMatrix','factsAnchor','readiness']),anchorKey:z.enum(ANCHOR_KEYS).optional()}).strict(),
 base.extend({action:z.literal('edit-anchor'),anchorKey:z.enum(ANCHOR_KEYS),sentence:z.string().trim().min(1).max(16000)}).strict(),
 base.extend({action:z.literal('seal'),sourceAttributionId:z.uuid(),reviewAnswers:z.record(z.string(),z.enum(['pass','fail'])),derived:z.unknown(),notes:z.string().max(16000).default('')}).strict(),
 base.extend({action:z.literal('successor'),reason:z.string().trim().min(1).max(4000)}).strict(),
 base.extend({action:z.literal('voice-session'),sdp:z.string().min(1).max(100000)}).strict(),
 z.object({action:z.literal('attest-source'),type:SourceType,name:z.string().trim().min(1).max(500),materialUsed:z.string().trim().min(1).max(8000),evidenceRefs:z.array(z.string().min(1).max(500)).min(1).max(100),statement:z.string().trim().min(10).max(16000)}).strict(),
 z.object({action:z.literal('revoke-source'),attributionId:z.uuid(),reason:z.string().trim().min(1).max(4000)}).strict(),
]);
