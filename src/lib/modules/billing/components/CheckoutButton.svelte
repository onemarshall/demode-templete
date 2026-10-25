<script lang="ts">
	import { authClient } from '#lib/modules/auth/client/client.js';

	interface Props {
		productId: string;
		label?: string;
		successUrl?: string;
		cancelUrl?: string;
		discountCode?: string;
		metadata?: Record<string, string>;
		class?: string;
		onError?: (error: string) => void;
	}

	let {
		productId,
		label = 'Subscribe',
		successUrl = '/dashboard',
		cancelUrl = '/',
		discountCode,
		metadata,
		class: className = '',
		onError
	}: Props = $props();

	let loading = $state(false);

	async function handleCheckout() {
		if (!productId) {
			onError?.('Product ID is required');
			return;
		}

		loading = true;

		try {
			const input: {
				productId: string;
				successUrl: string;
				cancelUrl: string;
				discountCode?: string;
				metadata?: Record<string, string>;
			} = {
				productId,
				successUrl,
				cancelUrl
			};

			if (discountCode) {
				input.discountCode = discountCode;
			}

			if (metadata) {
				input.metadata = metadata;
			}

			const { data, error: checkoutError } = await authClient.creem.createCheckout(input);

			if (checkoutError) {
				onError?.(checkoutError.message ?? 'Checkout failed');
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
			} else {
				onError?.('No checkout URL returned');
			}
		} catch (err) {
			onError?.(err instanceof Error ? err.message : 'Unexpected error');
		} finally {
			loading = false;
		}
	}
</script>

<button
	onclick={handleCheckout}
	disabled={loading}
	class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors {className}"
>
	{#if loading}
		<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		Processing...
	{:else}
		{label}
	{/if}
</button>
