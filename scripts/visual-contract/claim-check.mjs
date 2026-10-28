// Exercises the claim transaction's SQL against the real schema.
// Mirrors repository.claimDraft() statement for statement.
import 'dotenv/config';
import pg from 'pg';

const url = new URL(process.env.BETTER_DATABASE_URL);
const pool = new pg.Pool({
	host: url.hostname,
	port: url.port,
	user: decodeURIComponent(url.username),
	password: decodeURIComponent(url.password),
	database: decodeURIComponent(url.pathname.slice(1)).trim()
});

const user = (await pool.query('SELECT id FROM "user" LIMIT 1')).rows[0];
const brand = (await pool.query('SELECT id, organisation_id FROM brand LIMIT 1')).rows[0];

// A guest contract, as generation leaves it.
const draftId = crypto.randomUUID();
const versionId = crypto.randomUUID();
const publicId = 'claimtest' + Math.random().toString(36).slice(2, 10);

await pool.query(
	`INSERT INTO "visual_contract_draft"
		("id","guest_edit_token_hash","guest_expires_at","project_context","choices","current_step","status")
	 VALUES ($1,'deadbeef',now() + interval '7 days',$2::jsonb,$3::jsonb,'generated','generated')`,
	[draftId, JSON.stringify({ projectName: 'Claim Test' }), JSON.stringify({ warm_cool: 'warm' })]
);
await pool.query(
	`INSERT INTO "visual_contract_version"
		("id","draft_id","public_id","version_number","choices","project_context","content_version",
		 "rendered","confirmed_at","expires_at")
	 VALUES ($1,$2,$3,1,$4::jsonb,$5::jsonb,1,$6::jsonb,now(), now() + interval '7 days')`,
	[versionId, draftId, publicId, '{}', '{}', '{}']
);
await pool.query(`UPDATE "visual_contract_draft" SET "generated_version_id" = $2 WHERE "id" = $1`, [
	draftId,
	versionId
]);

const client = await pool.connect();
let ok = true;
const check = (label, pass) => {
	if (!pass) ok = false;
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
};

try {
	await client.query('BEGIN');
	await client.query(
		`UPDATE "visual_contract_draft"
		 SET "owner_user_id" = $2, "organisation_id" = $3, "brand_id" = $4,
		     "guest_edit_token_hash" = NULL, "guest_expires_at" = NULL,
		     "claimed_at" = now(), "updated_at" = now()
		 WHERE "id" = $1`,
		[draftId, user.id, brand.organisation_id, brand.id]
	);
	await client.query(
		`UPDATE "visual_contract_version"
		 SET "expires_at" = NULL, "organisation_id" = $2, "brand_id" = $3
		 WHERE "draft_id" = $1`,
		[draftId, brand.organisation_id, brand.id]
	);

	const outputId = crypto.randomUUID();
	await client.query(
		`INSERT INTO "output"
			("id","organisation_id","brand_id","product_key","title","format",
			 "share_slug","can_view","can_share","can_download")
		 VALUES ($1,$2,$3,'tool.visual_contract','Claim Test','web_page',$4,true,true,false)`,
		[outputId, brand.organisation_id, brand.id, publicId]
	);
	await client.query(`UPDATE "visual_contract_version" SET "output_id" = $2 WHERE "id" = $1`, [
		versionId,
		outputId
	]);

	const draft = (
		await client.query(
			`SELECT "owner_user_id","guest_edit_token_hash","guest_expires_at","brand_id","claimed_at"
			 FROM "visual_contract_draft" WHERE "id" = $1`,
			[draftId]
		)
	).rows[0];
	const version = (
		await client.query(`SELECT "expires_at","output_id" FROM "visual_contract_version" WHERE "id" = $1`, [
			versionId
		])
	).rows[0];

	check('draft owned by the signed-in user', draft.owner_user_id === user.id);
	check('guest capability removed', draft.guest_edit_token_hash === null);
	check('guest expiry removed', draft.guest_expires_at === null);
	check('brand attached', draft.brand_id === brand.id);
	check('claimed_at recorded', draft.claimed_at !== null);
	check('public page no longer expires', version.expires_at === null);
	check('documents entry linked', version.output_id !== null);

	await client.query('ROLLBACK');
} catch (error) {
	await client.query('ROLLBACK');
	ok = false;
	console.log('FAIL  claim transaction threw: ' + error.message);
} finally {
	client.release();
	await pool.query('DELETE FROM "visual_contract_version" WHERE "id" = $1', [versionId]);
	await pool.query('DELETE FROM "visual_contract_draft" WHERE "id" = $1', [draftId]);
	await pool.end();
}

console.log(ok ? '\nCLAIM SQL OK (rolled back, nothing persisted)' : '\nCLAIM SQL FAILED');
process.exit(ok ? 0 : 1);
