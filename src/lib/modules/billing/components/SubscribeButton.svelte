<script lang="ts">
	import { authClient } from '#lib/modules/auth/client/client.js';

	interface Props {
		plan: string;
	}

	let { plan }: Props = $props();

	async function handleCheckout() {
		await authClient.subscription.upgrade({
			plan,
			successUrl: '/dashboard',
			cancelUrl: '/subscribe',
			disableRedirect: false
		});
	}
</script>

<button onclick={handleCheckout}>Subscribe Now</button>
