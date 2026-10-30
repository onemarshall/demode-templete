import type { PageServerLoad } from './$types';
import { getDB } from '#lib/platform/database/db.js';
import { logger } from '#lib/platform/logger.js';

/**
 * Order status page. Serves both rails: card purchases arrive with a session
 * id, invoice purchases with an order id.
 *
 * The database is the source of truth, never the redirect. A buyer landing here
 * before the webhook has run sees "awaiting confirmation", not "paid".
 */
export const load: PageServerLoad = async ({ url }) => {
	const orderId = url.searchParams.get('order');
	const sessionId = url.searchParams.get('session_id');

	if (!orderId && !sessionId) {
		return { state: 'missing' as const, order: null };
	}

	try {
		const pool = await getDB();
		const { rows } = await pool.query<{
			id: string;
			status: string;
			plan_id: string;
			amount_minor: number;
			amount_paid_minor: number;
			currency: string;
			payment_rail: string;
			invoice_number: string | null;
			hosted_invoice_url: string | null;
			due_at: Date | string | null;
		}>(
			`SELECT "id", "status", "plan_id", "amount_minor", "amount_paid_minor",
			        "currency", "payment_rail", "invoice_number",
			        "hosted_invoice_url", "due_at"
			 FROM "purchase"
			 WHERE ($1::text IS NOT NULL AND "id" = $1)
			    OR ($2::text IS NOT NULL AND "stripe_session_id" = $2)
			 LIMIT 1`,
			[orderId, sessionId]
		);

		const order = rows[0];
		if (!order) {
			// The webhook may not have written the row yet.
			return { state: 'processing' as const, order: null };
		}

		return {
			state: order.status,
			order: {
				id: order.id,
				planId: order.plan_id,
				amountMinor: order.amount_minor,
				amountPaidMinor: order.amount_paid_minor,
				currency: order.currency,
				rail: order.payment_rail,
				invoiceNumber: order.invoice_number,
				hostedInvoiceUrl: order.hosted_invoice_url,
				dueAt: order.due_at ? new Date(order.due_at).toISOString() : null
			}
		};
	} catch (error) {
		logger.error('[purchase-status] failed to read order', {
			orderId,
			sessionId,
			error: error instanceof Error ? error.message : String(error)
		});
		return { state: 'processing' as const, order: null };
	}
};
