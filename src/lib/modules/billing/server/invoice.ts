/**
 * Route B: Stripe Invoicing.
 *
 * Used for business buyers who need an invoice document or pay through an
 * accounts department. On this account both `customer_balance` (bank transfer)
 * and card are available, so the hosted invoice offers bank transfer first with
 * card as the fallback.
 *
 * Stripe sends the invoice itself (`sendInvoice`), so no human issues it.
 *
 * Route C (external bank transfer) deliberately has no code here. It needs
 * authorised business bank details and a human reconciliation step, neither of
 * which exists yet. The schema supports it via `payment_rail =
 * 'external_invoice'` so the process can be recorded when it is defined.
 */
import type Stripe from 'stripe';
import { logger } from '#lib/platform/logger.js';
import type { BillingDetails } from './orders.js';

export interface InvoiceRequest {
	stripe: Stripe;
	customerId: string;
	priceId: string;
	planId: string;
	userId: string;
	orderId: string;
	consentAt: string;
	description: string;
	billing?: BillingDetails | null;
	/** Net payment terms. */
	daysUntilDue?: number;
}

export interface InvoiceResult {
	invoiceId: string;
	number: string | null;
	hostedInvoiceUrl: string | null;
	dueAt: string | null;
}

export async function createInvoice(request: InvoiceRequest): Promise<InvoiceResult> {
	const { stripe, customerId, priceId, planId, userId, orderId, consentAt, description } = request;

	const invoice = await stripe.invoices.create({
		customer: customerId,
		collection_method: 'send_invoice',
		days_until_due: request.daysUntilDue ?? 14,
		description,
		// Stated explicitly rather than inherited from account defaults, so the
		// invoice rail cannot silently change when the Dashboard changes. Bank
		// transfer is the cheaper route; card stays available as the fallback a
		// buyer can use immediately.
		payment_settings: {
			payment_method_types: ['customer_balance', 'card'],
		},
		// `exclude` prevents unrelated pending items on the customer from being
		// swept onto this invoice, which would charge for the wrong thing.
		pending_invoice_items_behavior: 'exclude',
		metadata: {
			plan: planId,
			referenceId: userId,
			orderId,
			cancellationConsentAt: consentAt,
			rail: 'stripe_invoice',
		},
	});

	await stripe.invoiceItems.create({
		customer: customerId,
		pricing: { price: priceId },
		invoice: invoice.id,
		description,
	});

	const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
	const sent = await stripe.invoices.sendInvoice(invoice.id);

	logger.info('[invoice] issued', {
		invoiceId: sent.id,
		orderId,
		planId,
		status: sent.status,
		number: sent.number,
	});

	return {
		invoiceId: sent.id,
		number: sent.number ?? null,
		hostedInvoiceUrl: sent.hosted_invoice_url ?? finalized.hosted_invoice_url ?? null,
		dueAt: sent.due_date ? new Date(sent.due_date * 1000).toISOString() : null,
	};
}
