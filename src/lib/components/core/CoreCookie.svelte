<script lang="ts">
	import { onMount } from "svelte";

	onMount(async () => {
		const { initCookieConsent } = await import(
			"$lib/services/cookie-consent/client"
		);
		void initCookieConsent();
	});
</script>
