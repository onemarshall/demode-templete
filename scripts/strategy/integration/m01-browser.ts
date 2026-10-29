/**
 * Browser proof for the isolated M01 integration app. Reads the already-created
 * M01 target and authenticated Playwright state; all generation uses the local
 * synthetic provider configured by the integration stack.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { chromium } from '@playwright/test';
import { integrationState, readConnection } from './local-stack';

type BrowserTarget = {
  url: string;
  base: string;
  sessionId: string;
  engagementId: string;
  grantId: string;
  documentId: string;
  versionId: string;
  handoff: string;
};

const read = async <T>(name: string): Promise<T> =>
  JSON.parse(await readFile(resolve(integrationState, name), 'utf8')) as T;
const target = await read<BrowserTarget>('m01-browser-target.json');
const storageState = await read<any>('m01-browser-state.json');
const config = await readConnection();
const pool = new Pool({ connectionString: config.databaseUrl });
const origin = new URL(target.url).origin;
if (!['http://127.0.0.1:5188', 'http://localhost:5188'].includes(origin)) {
  throw new Error('M01 browser proof only runs against the isolated local Auth app');
}
if (!target.base.startsWith('/o/') || !target.url.includes(target.sessionId)) {
  throw new Error('M01 browser target is incomplete');
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let assertions = 0;
const check = (value: unknown, label: string) => {
  if (!value) throw new Error(label);
  assertions++;
};
const pageErrors: string[] = [];
try {
  // M01 end-to-end cleanup revokes its temporary grant; restore only this
  // disposable browser fixture during the proof, then revoke it again below.
  await pool.query('UPDATE strategy_access_grant SET revoked_at=NULL WHERE id=$1', [target.grantId]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const savedDocument = page.getByRole('article', { name: 'Saved founder conviction document' });
  await savedDocument.waitFor({ timeout: 90000 });
  check(await savedDocument.count() === 1, 'Sealed founder conviction document is visible');
  check((await savedDocument.innerText()).includes('Founder Convictions'), 'Saved document content renders');
  check(await page.getByRole('link', { name: 'Download founder conviction' }).getAttribute('href')
    === `./founder-conviction/handoff?sessionId=${target.sessionId}&versionId=${target.versionId}&documentId=${target.documentId}`,
  'Export link points to the sealed document identity');
  check(await page.getByRole('button', { name: 'Create successor session' }).isVisible(), 'Sealed view offers a successor session');
  check(await page.getByRole('button', { name: 'Prepare interview plan' }).count() === 0, 'Sealed view has no preparation mutation');

  // Exercise the actual new-session flow in the browser. The local provider
  // returns stable synthetic plans and outputs; no real microphone is opened.
  await page.getByRole('button', { name: 'Start a conviction session' }).click();
  await page.waitForFunction((sealedId) => {
    const active = new URL(location.href).searchParams.get('sessionId');
    return !!active && active !== sealedId;
  }, target.sessionId, { timeout: 30000 });
  await page.locator('main > p').filter({ hasText: /^Revision 1(?:\s|$)/ }).waitFor({ timeout: 30000 });
  await page.getByLabel('Preparation note').fill('Synthetic browser note: keep the founder’s own words.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved.' }).waitFor({ timeout: 30000 });

  await page.getByRole('button', { name: 'Prepare interview plan', exact: true }).click();
  await page.getByText(/A synthetic pilot plan used only to exercise the M01 workflow\./)
    .waitFor({ timeout: 90000 });
  check(await page.getByText('The Broken Thing · Partial', { exact: true }).isVisible(), 'Prepared plan renders its element-level coverage');
  check(await page.getByRole('button', { name: 'Prepare interview plan', exact: true }).count() === 0,
    'The initial interview plan is prepared once');

  const answer = page.getByLabel('Your response');
  await answer.fill('Synthetic answer one: naming the difficulty early changed the outcome.');
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await page.getByText('Synthetic interview question: what did that silence cost you?').waitFor({ timeout: 90000 });
  await answer.fill('Synthetic answer two: silence made the same problem more expensive.');
  await page.getByRole('button', { name: 'Send response', exact: true }).click();
  await page.getByText('4 readable transcript lines saved.').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Synthesize conviction outputs', exact: true }).click();
  await page.getByRole('heading', { name: 'Conviction outputs', exact: true }).waitFor({ timeout: 90000 });

  const brokenThing = page.locator('article').filter({ has: page.getByRole('heading', { name: 'The Broken Thing', exact: true }) });
  await brokenThing.getByRole('button', { name: 'Approve this anchor', exact: true }).click();
  await brokenThing.getByText('Approval status: locked', { exact: true }).waitFor({ timeout: 30000 });
  const manifesto = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Manifesto', exact: true }) }).last();
  await manifesto.getByRole('button', { name: 'Approve manifesto', exact: true }).click();
  await manifesto.getByText('Approval status: locked', { exact: true }).waitFor({ timeout: 30000 });
  const languageBank = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Language bank', exact: true }) }).last();
  await languageBank.getByText('Approval status: candidate', { exact: true }).waitFor({ timeout: 30000 });
  check(await brokenThing.getByText('Approval status: locked', { exact: true }).isVisible(), 'Anchor approval is persisted independently');
  check(await manifesto.getByText('Approval status: locked', { exact: true }).isVisible(), 'Manifesto approval is persisted independently');
  check(await languageBank.getByText('Approval status: candidate', { exact: true }).isVisible(), 'Unapproved output remains a candidate');

  check(pageErrors.length === 0, `No browser console or runtime errors: ${pageErrors.join(' | ')}`);
  await page.screenshot({ path: resolve(integrationState, 'm01-browser-review.png'), fullPage: true });
  await writeFile(resolve(integrationState, 'm01-browser-result.json'), JSON.stringify({
    passed: true,
    assertions,
    synthetic: true,
    provider: 'loopback-contract',
    sealedSessionId: target.sessionId,
    browserFlow: 'create, note, prepare, interview, synthesise, independent approvals',
    at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
  console.log(`PASS: ${assertions} M01 sealed-document and browser workflow assertions.`);
  await context.close();
} finally {
  await browser?.close();
  await pool.query('UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1', [target.grantId]);
  await pool.end();
}
