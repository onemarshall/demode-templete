/**
 * Visual Contract — Designer Send delivery.
 *
 * Sending is only offered for a contract that belongs to an account, so the
 * link in the email cannot expire. Delivery is recorded before and after the
 * send, so a failure is visible rather than silent.
 */

import { getDB } from '#lib/platform/database/db.js';
import { getEmailProvider } from '#lib/modules/auth/server/email/index.js';
import { publicEnv } from '#lib/platform/config/index.js';
import { logger } from '#lib/platform/logger.js';
import { buildDesignerSendEmail } from './designer-send.js';
import type { ContractVersionRecord } from './repository.js';

/** A single contract should not be used as a bulk mailer. */
export const SENDS_PER_HOUR_LIMIT = 5;

export type SendResult =
	| { ok: true; sentTo: string; copiedToSelf: boolean }
	| { ok: false; message: string };

async function recordDelivery(params: {
	versionId: string;
	type: 'self' | 'designer';
	recipientEmail: string;
	recipientName?: string;
	senderEmail: string;
	senderName: string;
}): Promise<string> {
	const db = await getDB();
	const id = crypto.randomUUID();
	await db.query(
		`INSERT INTO "visual_contract_delivery"
			("id", "version_id", "delivery_type", "recipient_email", "recipient_name",
			 "sender_email", "sender_name", "state", "consent_marketing")
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', false)`,
		[
			id,
			params.versionId,
			params.type,
			params.recipientEmail,
			params.recipientName ?? null,
			params.senderEmail,
			params.senderName
		]
	);
	return id;
}

async function markDelivery(id: string, state: 'sent' | 'failed'): Promise<void> {
	const db = await getDB();
	await db.query(
		`UPDATE "visual_contract_delivery"
		 SET "state" = $2, "sent_at" = CASE WHEN $2 = 'sent' THEN now() ELSE NULL END
		 WHERE "id" = $1`,
		[id, state]
	);
}

export async function sendContractToDesigner(params: {
	version: ContractVersionRecord;
	senderName: string;
	senderEmail: string;
	recipientEmail: string;
	recipientName?: string;
	introLine?: string;
	sendCopyToSelf: boolean;
	contractUrl: string;
}): Promise<SendResult> {
	const db = await getDB();
	const { rows } = await db.query<{ count: number }>(
		`SELECT count(*)::int AS "count" FROM "visual_contract_delivery"
		 WHERE "version_id" = $1 AND "created_at" > now() - interval '1 hour'`,
		[params.version.id]
	);
	if (rows[0].count >= SENDS_PER_HOUR_LIMIT) {
		return { ok: false, message: 'This contract has been sent several times already. Try again later.' };
	}

	const provider = getEmailProvider();
	if (!provider) return { ok: false, message: 'Email is not configured on this site.' };

	const projectName = params.version.projectContext.projectName?.trim() || 'Visual Contract';
	const email = buildDesignerSendEmail({
		projectName,
		recipientName: params.recipientName,
		senderName: params.senderName,
		appName: publicEnv.PUBLIC_APP_NAME,
		introLine: params.introLine,
		contractUrl: params.contractUrl,
		content: params.version.rendered
	});

	const designerDelivery = await recordDelivery({
		versionId: params.version.id,
		type: 'designer',
		recipientEmail: params.recipientEmail,
		recipientName: params.recipientName,
		senderEmail: params.senderEmail,
		senderName: params.senderName
	});

	try {
		await provider.sendEmail({
			to: params.recipientEmail,
			subject: email.subject,
			html: email.html,
			text: email.text,
			// Replies should reach the client, not the tool.
			replyTo: params.senderEmail
		});
		await markDelivery(designerDelivery, 'sent');
	} catch (cause) {
		await markDelivery(designerDelivery, 'failed');
		logger.error('[visual-contract] designer send failed', {
			error: cause instanceof Error ? cause.message : String(cause)
		});
		return { ok: false, message: 'We could not send that email. Please try again.' };
	}

	let copiedToSelf = false;
	if (params.sendCopyToSelf) {
		const selfDelivery = await recordDelivery({
			versionId: params.version.id,
			type: 'self',
			recipientEmail: params.senderEmail,
			senderEmail: params.senderEmail,
			senderName: params.senderName
		});
		try {
			await provider.sendEmail({
				to: params.senderEmail,
				subject: email.subject,
				html: email.html,
				text: email.text
			});
			await markDelivery(selfDelivery, 'sent');
			copiedToSelf = true;
		} catch (cause) {
			await markDelivery(selfDelivery, 'failed');
			logger.error('[visual-contract] self copy failed', {
				error: cause instanceof Error ? cause.message : String(cause)
			});
		}
	}

	return { ok: true, sentTo: params.recipientEmail, copiedToSelf };
}
