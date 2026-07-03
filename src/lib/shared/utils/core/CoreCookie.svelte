<script lang="ts">
	import { onMount } from 'svelte'
	import { initCookieConsent } from '$lib/features/cookie-consent'

	onMount(() => {
		void initCookieConsent()
	})
</script>
