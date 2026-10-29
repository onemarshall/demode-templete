#!/usr/bin/env bun
/**
 * Create an organisation and its first brand, or reuse what already exists.
 *
 * This is the operator path for a client organisation. It mirrors
 * `ensurePersonalOrganisation` and `createBrand` without their session
 * requirement, because a headless setup has no signed-in user to brand the
 * request. It writes the same rows those services write — organisation,
 * owner membership, brand, brand_admin assignment — plus an audit event, so a
 * brand created here is indistinguishable from one created in the app.
 *
 * Deliberately not a personal organisation: no `personal_organisation_owner`
 * row, and `metadata.montsel.type` is `client`.
 *
 *   bun scripts/tenancy/create-organisation-brand.ts \
 *     --organisation="Hestia" --brand="Hestia" --owner=apps@iamstudios.cc
 *
 * Idempotent: a second run reports the existing ids and writes nothing.
 */

import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import { configureDatabase, getDB, withTransaction } from '../../src/lib/platform/database/db.ts';
import { writeAuditEvent } from '../../src/lib/modules/tenancy/server/audit.ts';

dotenv.config();

const args = new Map(
	process.argv
		.slice(2)
		.filter((argument) => argument.startsWith('--'))
		.map((argument) => {
			const [key, ...rest] = argument.replace(/^--/, '').split('=');
			return [key, rest.join('=')];
		}),
);

const organisationName = args.get('organisation')?.trim();
const brandName = args.get('brand')?.trim();
const ownerEmail = args.get('owner')?.trim();
const requestedSlug = args.get('slug')?.trim();

if (!organisationName || !brandName || !ownerEmail)
	throw new Error('Pass --organisation=<name> --brand=<name> --owner=<email>.');

const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 48);

const organisationSlug = requestedSlug ? slugify(requestedSlug) : slugify(organisationName);
const brandSlug = requestedSlug ? slugify(requestedSlug) : slugify(brandName);
if (!organisationSlug || !brandSlug) throw new Error('Slugs must contain letters or digits.');

const databaseUrl = process.env.BETTER_DATABASE_URL;
if (!databaseUrl) throw new Error('BETTER_DATABASE_URL is required');
configureDatabase(databaseUrl);

const db = await getDB();
const { rows: users } = await db.query<{ id: string }>(
	`SELECT "id" FROM "user" WHERE lower("email") = lower($1)`,
	[ownerEmail],
);
const owner = users[0];
if (!owner) throw new Error(`No user with email ${ownerEmail}.`);

const result = await withTransaction(async (client) => {
	const { rows: existingOrganisation } = await client.query<{ id: string; name: string }>(
		`SELECT "id", "name" FROM "organization" WHERE "slug" = $1`,
		[organisationSlug],
	);
	let organisationId = existingOrganisation[0]?.id;
	const organisationCreated = !organisationId;

	if (!organisationId) {
		organisationId = randomUUID().replace(/-/g, '');
		await client.query(
			`INSERT INTO "organization" ("id", "name", "slug", "metadata", "createdAt")
			 VALUES ($1, $2, $3, $4, now())`,
			[organisationId, organisationName, organisationSlug, '{"montsel":{"type":"client"}}'],
		);
	}

	const { rows: membership } = await client.query<{ id: string }>(
		`SELECT "id" FROM "member" WHERE "organizationId" = $1 AND "userId" = $2`,
		[organisationId, owner.id],
	);
	if (membership.length === 0) {
		await client.query(
			`INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt")
			 VALUES ($1, $2, $3, 'owner', now())`,
			[randomUUID().replace(/-/g, ''), organisationId, owner.id],
		);
	}

	const { rows: existingBrand } = await client.query<{ id: string; name: string }>(
		`SELECT "id", "name" FROM "brand" WHERE "organisation_id" = $1 AND "slug" = $2`,
		[organisationId, brandSlug],
	);
	let brandId = existingBrand[0]?.id;
	const brandCreated = !brandId;

	if (!brandId) {
		brandId = randomUUID().replace(/-/g, '');
		await client.query(
			`INSERT INTO "brand" ("id", "organisation_id", "name", "slug", "created_by", "status")
			 VALUES ($1, $2, $3, $4, $5, 'active')`,
			[brandId, organisationId, brandName, brandSlug, owner.id],
		);
		await client.query(
			`INSERT INTO "brand_member"
			        ("id", "brand_id", "user_id", "role", "status", "grant_source", "granted_by")
			 VALUES ($1, $2, $3, 'brand_admin', 'active', 'managed', $3)`,
			[randomUUID().replace(/-/g, ''), brandId, owner.id],
		);
		await writeAuditEvent(
			{
				organisationId,
				brandId,
				actorUserId: owner.id,
				action: 'brand.created',
				resourceType: 'brand',
				resourceId: brandId,
				metadata: { name: brandName, slug: brandSlug, source: 'operator-script' },
			},
			client,
		);
	}

	if (organisationCreated) {
		await writeAuditEvent(
			{
				organisationId,
				actorUserId: owner.id,
				action: 'organisation.created',
				resourceType: 'organisation',
				resourceId: organisationId,
				metadata: { name: organisationName, slug: organisationSlug, type: 'client' },
			},
			client,
		);
	}

	return { organisationId, brandId, organisationCreated, brandCreated };
});

console.log(
	`${result.organisationCreated ? 'created' : 'existing'} organisation ${result.organisationId} (${organisationSlug})`,
);
console.log(`${result.brandCreated ? 'created' : 'existing'} brand ${result.brandId} (${brandSlug})`);
console.log(`\nImport with: --brand=${result.brandId}`);

await db.end();
