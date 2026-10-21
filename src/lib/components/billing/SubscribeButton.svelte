<script lang="ts">
	import { authClient } from '#lib/auth-client.js';

	interface Props {
		productId: string;
	}

	let { productId }: Props = $props();

	async function handleCheckout() {
		const { data, error } = await authClient.creem.createCheckout({
			productId,
			successUrl: '/dashboard',
			discountCode: 'LAUNCH50', // Optional
			metadata: { planType: 'pro' } // Optional
		});

		if (data?.url) {
			window.location.href = data.url;
		}
	}
</script>

<button onclick={handleCheckout}>Subscribe Now</button>
