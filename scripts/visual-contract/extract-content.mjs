#!/usr/bin/env node
/**
 * Regenerate the Visual Contract evaluation copy from the canonical pair specs.
 *
 *   node scripts/visual-contract/extract-content.mjs [specs-dir]
 *
 * Reads pair-*.md from the DeMode visual-contract methodology specs and writes
 * src/lib/modules/visual-contract/shared/content/v1.ts.
 *
 * Fails loudly when a pair spec is missing a field, so a half-filled content
 * module can never reach the app. Bump VISUAL_CONTRACT_CONTENT_VERSION when the
 * generated strings change: stored contract versions record the version they
 * were rendered with.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_DIR =
  '/Users/rob/Documents/LIFE/1_Projects/_02_DeMode/03-Products/standalone/visual-contract/docs/methodology/specs';

const DIR = process.argv[2] ?? process.env.VISUAL_CONTRACT_SPECS ?? DEFAULT_DIR;
const OUT = resolve(
  import.meta.dirname,
  '../../src/lib/modules/visual-contract/shared/content/v1.ts'
);

const PAIRS = [
  { axis: 'warm_cool', file: 'pair-warm-cool.md' },
  { axis: 'spacious_full', file: 'pair-spacious-dense.md' },
  { axis: 'calm_energetic', file: 'pair-calm-energetic.md' },
  { axis: 'restrained_expressive', file: 'pair-restrained-expressive.md' },
  { axis: 'clean_raw', file: 'pair-clean-raw.md' },
  { axis: 'focused_layered', file: 'pair-focused-layered.md' }
];

// The framework axis is Spacious/Dense; every client-facing surface must say Full.
const DISPLAY = { Dense: 'Full' };

function sections(md) {
  const lines = md.split('\n');
  const out = [];
  let current = null;
  for (const line of lines) {
    const m = /^### (\d+)\. (\w+): (.+?)\s*$/.exec(line);
    if (m) {
      if (current) out.push(current);
      current = { n: Number(m[1]), quality: m[2], title: m[3], body: [] };
      continue;
    }
    if (/^## /.test(line) && current) {
      out.push(current);
      current = null;
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) out.push(current);
  return out;
}

const bullets = (body) =>
  body
    .map((l) => l.trim())
    .filter((l) => /^- ".*"$/.test(l))
    .map((l) => l.replace(/^- "|"$/g, '').trim());

function parse(file) {
  const md = readFileSync(join(DIR, file), 'utf8');
  const parts = sections(md);
  const qualities = {};
  for (const part of parts) {
    const word = DISPLAY[part.quality] ?? part.quality;
    const q = (qualities[word] ??= { word });
    if (part.n === 1) {
      q.coreMeaning = part.body.map((l) => l.trim()).find((l) => l.length > 0) ?? '';
    } else if (part.n === 4) {
      const raw = part.body.map((l) => l.trim()).find((l) => l.startsWith('**')) ?? '';
      q.evaluationQuestion = raw.replace(/^\*\*|\*\*$/g, '').trim();
    } else if (part.n === 5) q.meeting = bullets(part.body);
    else if (part.n === 6) q.notEnough = bullets(part.body);
    else if (part.n === 7) q.tooFar = bullets(part.body);
    else if (part.n === 9) q.unsure = bullets(part.body);
  }
  return qualities;
}

// Client-facing naming substitution for pair 2 only. The framework word is
// Dense; every surface a client sees must say Full.
const changes = [];
function clientWord(value, where) {
  if (typeof value === 'string') {
    const next = value
      .replace(/\bdenser\b/g, 'fuller')
      .replace(/\bDense\b/g, 'Full')
      .replace(/\bdense\b/g, 'full');
    if (next !== value) changes.push({ where, before: value, after: next });
    return next;
  }
  return value.map((v, i) => clientWord(v, `${where}[${i}]`));
}

const data = {};
for (const { axis, file } of PAIRS) {
  const q = parse(file);
  const keys = Object.keys(q);
  if (keys.length !== 2) throw new Error(`${axis}: expected 2 qualities, got ${keys.join(',')}`);
  for (const k of keys) {
    const v = q[k];
    for (const field of ['coreMeaning', 'evaluationQuestion', 'meeting', 'notEnough', 'tooFar', 'unsure']) {
      const val = v[field];
      if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        throw new Error(`${axis}/${k}: missing ${field}`);
      }
    }
  }
  data[axis] = { a: q[keys[0]], b: q[keys[1]] };
}

for (const [axis, pair] of Object.entries(data)) {
  for (const side of ['a', 'b']) {
    const v = pair[side];
    v.coreMeaning = v.coreMeaning.replace(/`/g, '');
    if (axis !== 'spacious_full') continue;
    const where = `${axis}.${side}`;
    v.coreMeaning = clientWord(v.coreMeaning, `${where}.coreMeaning`);
    v.evaluationQuestion = clientWord(v.evaluationQuestion, `${where}.evaluationQuestion`);
    for (const field of ['meeting', 'notEnough', 'tooFar', 'unsure']) {
      v[field] = clientWord(v[field], `${where}.${field}`);
    }
  }
}

console.log(`\n--- client-facing word substitutions (${changes.length}) ---`);
for (const c of changes) console.log(`${c.where}\n  before: ${c.before}\n  after:  ${c.after}`);

const q = (s) => JSON.stringify(s);
const arr = (a) => `[\n${a.map((x) => `\t\t\t\t${q(x)}`).join(',\n')}\n\t\t\t]`;
const block = (v) => `\t\t${v.word.toLowerCase()}: {
\t\t\tword: ${q(v.word)},
\t\t\tcoreMeaning: ${q(v.coreMeaning)},
\t\t\tevaluationQuestion: ${q(v.evaluationQuestion)},
\t\t\tmeeting: ${arr(v.meeting)},
\t\t\tnotEnough: ${arr(v.notEnough)},
\t\t\ttooFar: ${arr(v.tooFar)},
\t\t\tunsure: ${arr(v.unsure)}
\t\t}`;

const body = Object.entries(data)
  .map(([axis, { a, b }]) => `\t${axis}: {\n${block(a)},\n${block(b)}\n\t}`)
  .join(',\n');

const out = `/**
 * Visual Contract — deep evaluation copy, version 1.
 *
 * GENERATED FROM the canonical pair specifications:
 *   docs/methodology/specs/pair-*.md
 *   (DeMode repository: 03-Products/standalone/visual-contract)
 *
 * Do not hand-edit the strings in this file. The pair specs are the source of
 * truth; regenerate instead. A change here is a content-version change and must
 * bump VISUAL_CONTRACT_CONTENT_VERSION so stored contract versions keep
 * pointing at the copy they were rendered with.
 *
 * Naming: the framework axis is Spacious/Dense. The client-facing word is
 * \`Full\`, applied at extraction time.
 */

import type { EvaluationCopy } from '../types.js';

export const VISUAL_CONTRACT_CONTENT_VERSION = 1;

export const EVALUATION_COPY_V1 = {
${body}
} as const satisfies Record<string, Record<string, EvaluationCopy>>;
`;

writeFileSync(OUT, out);
console.log(`wrote ${OUT}`);
for (const [axis, { a, b }] of Object.entries(data)) {
  console.log(`${axis}: ${a.word}/${b.word}  meeting=${a.meeting.length}/${b.meeting.length} notEnough=${a.notEnough.length}/${b.notEnough.length} tooFar=${a.tooFar.length}/${b.tooFar.length} unsure=${a.unsure.length}/${b.unsure.length}`);
  console.log(`  A meaning: ${a.coreMeaning}`);
  console.log(`  A question: ${a.evaluationQuestion}`);
}
