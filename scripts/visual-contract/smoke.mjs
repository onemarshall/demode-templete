// End-to-end smoke test of the public Visual Contract journey.
// Prints status codes and short markers only.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const ORIGIN = 'http://localhost:5180';
const envLine = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
	.split('\n')
	.find((l) => l.startsWith('BETTER_DATABASE_URL='));
const dbUrl = new URL(
	envLine.split('=').slice(1).join('=').replace(/^['"]|['"]$/g, '')
);

const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
const log = [];

async function go(path, form) {
	const cookies = cookieHeader();
	const res = await fetch(ORIGIN + path, {
		method: form ? 'POST' : 'GET',
		redirect: 'manual',
		headers: {
			...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
			...(cookies ? { cookie: cookies } : {})
		},
		body: form ? new URLSearchParams(form).toString() : undefined
	});
	for (const raw of res.headers.getSetCookie?.() ?? []) {
		const [pair] = raw.split(';');
		const index = pair.indexOf('=');
		const name = pair.slice(0, index);
		const value = pair.slice(index + 1);
		if (value === '' || /max-age=0/i.test(raw)) jar.delete(name);
		else jar.set(name, value);
	}
	const location = res.headers.get('location');
	const body = await res.text();

	// A form action invoked by the JS client returns its result as JSON rather than
	// a 303. Treat that as the redirect it describes.
	if (!location) {
		try {
			const parsed = JSON.parse(body);
			if (parsed?.type === 'redirect') {
				return { status: parsed.status ?? 303, location: parsed.location, text: '' };
			}
		} catch {
			/* not JSON: an ordinary page or an HTTP error */
		}
	}

	return { status: res.status, location, text: res.status >= 400 ? body : '' };
}

const step = async (label, path, form) => {
	const r = await go(path, form);
	log.push(`${label.padEnd(28)} ${r.status}${r.location ? ' -> ' + r.location.replace(ORIGIN, '') : ''}`);
	if (r.status >= 400) log.push('   body: ' + r.text.replace(/\s+/g, ' ').slice(0, 200));
	return r;
};

await step('GET landing', '/visual-contract');
const started = await step('POST start', '/visual-contract', {});
if (started.status !== 303) {
	console.log(log.join('\n'));
	process.exit(1);
}
// The start action redirects to .../<draftId>/context; keep only the draft root.
const base = started.location.replace(/\/context$/, '');

await step('GET context', base + '/context');
const ctx = await step('POST context', base + '/context', {
	projectName: 'Smoke Test Project',
	clientName: 'Test Co',
	projectType: 'Website',
	description: 'Created by the automated smoke test.'
});
let next = ctx.status === 303 ? ctx.location : null;

const values = ['warm', 'spacious', 'calm', 'restrained', 'clean', 'focused'];
for (let i = 1; i <= 6; i++) {
	if (!next) break;
	const r = await step(`POST choose/${i}`, next, { value: values[i - 1] });
	next = r.status === 303 ? r.location : null;
}

if (next) {
	const conf = await step('POST confirm', next, {});
	next = conf.status === 303 ? conf.location : null;
}
if (next) {
	const rev = await step('POST review (generate)', next, {});
	next = rev.status === 303 ? rev.location : null;
}
const generatedPath = next;
if (generatedPath) await step('GET generated', generatedPath);

const pool = new pg.Pool({
	host: dbUrl.hostname,
	port: dbUrl.port,
	user: decodeURIComponent(dbUrl.username),
	password: decodeURIComponent(dbUrl.password),
	// The configured database name carries trailing spaces; Postgres does not.
	database: decodeURIComponent(dbUrl.pathname.slice(1)).trim()
});
const { rows } = await pool.query(
	`SELECT v."public_id" AS "id", v."content_version" AS "cv", d."status",
	        v."expires_at" AS "expiresAt", d."guest_expires_at" AS "draftExpiresAt"
	 FROM "visual_contract_version" v
	 JOIN "visual_contract_draft" d ON d."id" = v."draft_id"
	 ORDER BY v."created_at" DESC LIMIT 1`
);

if (!rows.length) {
	console.log(log.join('\n'));
	console.log('NO VERSION ROW CREATED');
	process.exit(1);
}

const { id, cv, status, expiresAt, draftExpiresAt } = rows[0];
const page = await step('GET public contract', '/contract/' + id);
log.push(`   version content=${cv} draft.status=${status}`);

const html = await (await fetch(ORIGIN + '/contract/' + id)).text();
log.push('   has Brief: ' + html.includes('Visual Contract Brief'));
log.push('   has Companion: ' + html.includes('Evaluation Companion'));
log.push('   shows Full: ' + /\bFull\b/.test(html));
log.push('   leaks Dense: ' + /\bdense\b/i.test(html));

// Expiry: a guest contract must expire, and must say so before it does.
const days = (d) => Math.round((new Date(d) - Date.now()) / 86_400_000);
log.push(`   contract expires in ~${days(expiresAt)}d, draft in ~${days(draftExpiresAt)}d`);
log.push('   public page states expiry: ' + /This link expires on/.test(html));

// The guest generated page needs the cookie, like a browser would send.
const generated = await (await fetch(ORIGIN + generatedPath, { headers: { cookie: cookieHeader() } })).text();
log.push('   generated shows claim panel: ' + generated.includes('Keep this contract'));
log.push('   generated offers sign-up: ' + generated.includes('/auth/sign-up?redirectTo='));
log.push('   email locked until saved: ' + generated.includes('We only send links that will still open'));

// The return-to intent must survive a verification detour, which lands on
// /auth/sign-in with no query string at all.
log.push('   return-to cookie set: ' + jar.has('auth_return_to'));
const signIn = await (await fetch(ORIGIN + '/auth/sign-in?verified=true', { headers: { cookie: cookieHeader() } })).text();
log.push('   sign-in resumes claim: ' + signIn.includes(`value="/visual-contract/${base.split('/')[2]}/claim"`));

const explicit = await (
	await fetch(ORIGIN + '/auth/sign-in?redirectTo=' + encodeURIComponent('/contract/abc'), {
		headers: { cookie: cookieHeader() }
	})
).text();
log.push('   explicit redirectTo wins: ' + explicit.includes('value="/contract/abc"'));

const hostile = await (
	await fetch(ORIGIN + '/auth/sign-in?redirectTo=' + encodeURIComponent('//evil.example'), {
		headers: { cookie: cookieHeader() }
	})
).text();
log.push('   protocol-relative rejected: ' + !hostile.includes('value="//evil.example"'));

const claimOut = await fetch(ORIGIN + base + '/claim', { redirect: 'manual' });
log.push(
	`   claim while signed out -> ${claimOut.status} ${(claimOut.headers.get('location') ?? '').split('?')[0]}`
);

// Re-submitting generation must not fork the shared link.
const again = await go(base + '/review', {});
const after = await pool.query(
	`SELECT count(*)::int AS n FROM "visual_contract_version" v
	 JOIN "visual_contract_draft" d ON d."id" = v."draft_id" WHERE d."id" = $1`,
	[base.split('/')[2]]
);
log.push(`   regenerate -> ${again.status}, versions for draft: ${after.rows[0].n}`);

// Force expiry and confirm the page stops resolving with a clear status.
await pool.query(
	`UPDATE "visual_contract_version" SET "expires_at" = now() - interval '1 minute' WHERE "public_id" = $1`,
	[id]
);
const gone = await fetch(ORIGIN + '/contract/' + id);
log.push(`   expired public page -> ${gone.status}`);

// Leave the database as we found it; versions cascade with the draft.
await pool.query('DELETE FROM "visual_contract_draft" WHERE "id" = $1', [base.split('/')[2]]);

await pool.end();

console.log(log.join('\n'));
console.log(page.status === 200 ? '\nOK' : '\nFAILED');
