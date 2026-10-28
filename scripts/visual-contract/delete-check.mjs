// Exercises the delete transaction against the real schema.
// Mirrors repository.deleteDraft() statement for statement.
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

const brand = (await pool.query('SELECT id, organisation_id FROM brand LIMIT 1')).rows[0];
const user = (await pool.query('SELECT id FROM "user" LIMIT 1')).rows[0];
const draftId = crypto.randomUUID();
const versionId = crypto.randomUUID();
const outputId = crypto.randomUUID();
const deliveryId = crypto.randomUUID();
const publicId = 'deltest' + Math.random().toString(36).slice(2, 10);

await pool.query(
	`INSERT INTO "visual_contract_draft"
		("id","owner_user_id","organisation_id","brand_id","project_context","choices","current_step","status")
	 VALUES ($1,$2,$3,$4,'{"projectName":"Delete Test"}'::jsonb,'{}'::jsonb,'generated','generated')`,
	[draftId, user.id, brand.organisation_id, brand.id]
);
await pool.query(
	`INSERT INTO "output"
		("id","organisation_id","brand_id","product_key","title","format","share_slug",
		 "can_view","can_share","can_download")
	 VALUES ($1,$2,$3,'tool.visual_contract','Delete Test','web_page',$4,true,true,false)`,
	[outputId, brand.organisation_id, brand.id, publicId]
);
await pool.query(
	`INSERT INTO "visual_contract_version"
		("id","draft_id","public_id","version_number","choices","project_context","content_version",
		 "rendered","confirmed_at","organisation_id","brand_id","output_id")
	 VALUES ($1,$2,$3,1,'{}'::jsonb,'{}'::jsonb,1,'{}'::jsonb,now(),$4,$5,$6)`,
	[versionId, draftId, publicId, brand.organisation_id, brand.id, outputId]
);
await pool.query(`UPDATE "visual_contract_draft" SET "generated_version_id" = $2 WHERE "id" = $1`, [
	draftId,
	versionId
]);
await pool.query(
	`INSERT INTO "visual_contract_delivery"
		("id","version_id","delivery_type","recipient_email","state")
	 VALUES ($1,$2,'designer','designer@example.test','sent')`,
	[deliveryId, versionId]
);

let ok = true;
const check = (label, pass) => {
	if (!pass) ok = false;
	console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
};

try {
	const client = await pool.connect();
	await client.query('BEGIN');
	await client.query(
		`DELETE FROM "output"
		 WHERE "id" IN (
			SELECT "output_id" FROM "visual_contract_version"
			WHERE "draft_id" = $1 AND "output_id" IS NOT NULL
		 )`,
		[draftId]
	);
	await client.query(`DELETE FROM "visual_contract_draft" WHERE "id" = $1`, [draftId]);
	await client.query('COMMIT');
	client.release();
} catch (error) {
	console.log('FAIL  delete threw: ' + error.message);
	ok = false;
}

const count = async (sql, params) => (await pool.query(sql, params)).rows[0].n;
check(
	'draft removed',
	(await count('SELECT count(*)::int AS n FROM "visual_contract_draft" WHERE "id" = $1', [draftId])) === 0
);
check(
	'version cascaded',
	(await count('SELECT count(*)::int AS n FROM "visual_contract_version" WHERE "draft_id" = $1', [draftId])) === 0
);
check(
	'delivery cascaded',
	(await count('SELECT count(*)::int AS n FROM "visual_contract_delivery" WHERE "id" = $1', [deliveryId])) === 0
);
check(
	'documents entry removed',
	(await count('SELECT count(*)::int AS n FROM "output" WHERE "id" = $1', [outputId])) === 0
);

await pool.end();
console.log(ok ? '\nDELETE SQL OK' : '\nDELETE SQL FAILED');
process.exit(ok ? 0 : 1);
