<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const money = (minor: number) =>
		new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);

	const due = $derived(data.order?.dueAt ? new Date(data.order.dueAt).toLocaleDateString('en-GB') : null);

	const headings: Record<string, string> = {
		activated: 'Purchase confirmed',
		paid: 'Payment received',
		awaiting_payment: 'Awaiting payment',
		partially_paid: 'Payment incomplete',
		requires_review: 'Payment under review',
		failed: 'Payment failed',
		cancelled: 'Order cancelled',
		expired: 'Order expired',
		refunded: 'Order refunded',
		processing: 'Payment received',
		missing: 'No order reference'
	};

	const heading = $derived(headings[data.state] ?? 'Order status');
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
	<div class="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-8">
		<h1 class="text-2xl font-bold text-gray-900">{heading}</h1>

		{#if data.state === 'activated'}
			<p class="mt-3 text-gray-600">
				Your payment is confirmed and access has been granted. A receipt is on
				its way to your email address.
			</p>
			<a href="/auth/dashboard" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Go to your dashboard
			</a>
		{:else if data.state === 'awaiting_payment' && data.order}
			<p class="mt-3 text-gray-600">
				Your invoice has been issued. Access is granted automatically once your
				bank transfer is received.
			</p>
			<dl class="mt-6 space-y-2 text-sm">
				{#if data.order.invoiceNumber}
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">Invoice</dt>
						<dd class="font-mono text-gray-900">{data.order.invoiceNumber}</dd>
					</div>
				{/if}
				<div class="flex justify-between gap-4">
					<dt class="text-gray-500">Amount due</dt>
					<dd class="font-medium text-gray-900">{money(data.order.amountMinor)}</dd>
				</div>
				{#if due}
					<div class="flex justify-between gap-4">
						<dt class="text-gray-500">Due by</dt>
						<dd class="text-gray-900">{due}</dd>
					</div>
				{/if}
				<div class="flex justify-between gap-4">
					<dt class="text-gray-500">Status</dt>
					<dd class="text-gray-900">Awaiting payment</dd>
				</div>
			</dl>
			<p class="mt-4 text-sm text-gray-600">
				Bank transfers usually clear within 0–3 business days. Payment
				instructions are on the invoice.
			</p>
			{#if data.order.hostedInvoiceUrl}
				<a
					href={data.order.hostedInvoiceUrl}
					class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white"
				>
					View invoice and payment instructions
				</a>
			{/if}
		{:else if data.state === 'paid'}
			<p class="mt-3 text-gray-600">
				We have confirmed your payment and are granting access now. This usually
				takes a few seconds.
			</p>
			<a href="/auth/dashboard" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Go to your dashboard
			</a>
		{:else if data.state === 'partially_paid' && data.order}
			<p class="mt-3 text-gray-600">
				We received {money(data.order.amountPaidMinor)} against an order of
				{money(data.order.amountMinor)}. Access is not granted until the balance
				is settled. Reply to your invoice email and we will resolve it.
			</p>
		{:else if data.state === 'requires_review' && data.order}
			<p class="mt-3 text-gray-600">
				Your payment needs a manual check before access is granted. We will
				contact you shortly; you do not need to pay again.
			</p>
		{:else if data.state === 'refunded'}
			<p class="mt-3 text-gray-600">
				This order has been refunded and access has been withdrawn.
			</p>
			<a href="/auth/pricing" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Back to pricing
			</a>
		{:else if data.state === 'processing'}
			<p class="mt-3 text-gray-600">
				Stripe has taken the payment and we are recording it now. Refresh this
				page if it does not update.
			</p>
			<a href="/auth/dashboard" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Go to your dashboard
			</a>
		{:else if data.state === 'missing'}
			<p class="mt-3 text-gray-600">
				This page needs the reference Stripe sends after checkout. If you have
				just paid, check your email for the receipt.
			</p>
			<a href="/auth/pricing" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Back to pricing
			</a>
		{:else}
			<p class="mt-3 text-gray-600">
				This order is not active. If you believe that is wrong, reply to your
				invoice or receipt email.
			</p>
			<a href="/auth/pricing" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Back to pricing
			</a>
		{/if}
	</div>
</div>
