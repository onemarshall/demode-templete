<script lang="ts">
	import { authClient } from '#lib/modules/auth/client/client.js';

	async function handlePortal() {
		// The client follows the endpoint's `redirect: true` to the billing portal.
		await authClient.subscription.billingPortal({ returnUrl: '/dashboard' });
	}
</script>

<button onclick={handlePortal}>Manage Subscription</button>
