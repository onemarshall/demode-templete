<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const formatted = $derived(
		data.amountMinor === null
			? null
			: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
					data.amountMinor / 100,
				),
	);
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
	<div class="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8">
		{#if data.state === 'confirmed'}
			<h1 class="text-2xl font-bold text-gray-900">Purchase confirmed</h1>
			<p class="mt-3 text-gray-600">
				We have recorded your payment{formatted ? ` of ${formatted}` : ''}. A
				receipt and your next steps are on the way to your email address.
			</p>
			<a
				href="/auth/dashboard"
				class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white"
			>
				Go to your dashboard
			</a>
		{:else if data.state === 'processing'}
			<h1 class="text-2xl font-bold text-gray-900">Payment received</h1>
			<p class="mt-3 text-gray-600">
				Stripe has taken the payment and we are recording it now. This usually
				takes a few seconds. Refresh this page if your purchase does not appear.
			</p>
			<a href="/auth/dashboard" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Go to your dashboard
			</a>
		{:else}
			<h1 class="text-2xl font-bold text-gray-900">No purchase reference</h1>
			<p class="mt-3 text-gray-600">
				This page needs the reference Stripe sends after checkout. If you have
				just paid, check your email for the receipt.
			</p>
			<a href="/auth/pricing" class="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-white">
				Back to pricing
			</a>
		{/if}
	</div>
</div>
