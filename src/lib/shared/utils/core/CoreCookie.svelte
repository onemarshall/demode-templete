<script lang="ts">
	import { onMount } from "svelte";

	onMount(async () => {
		const { initCookieConsent } = await import(
			"$lib/features/cookie-consent/client"
		);
		void initCookieConsent();
	});
</script>
