<script lang="ts">
	import { authClient } from '#lib/auth/auth-client.js';

	async function handlePortal() {
		// redirect: true opts in to the client's auto-navigation to the
		// returned portal URL (not the default since @creem_io/better-auth 2.x)
		const { data, error } = await authClient.creem.createPortal({ redirect: true });
	}
</script>

<button onclick={handlePortal}>Manage Subscription</button>
