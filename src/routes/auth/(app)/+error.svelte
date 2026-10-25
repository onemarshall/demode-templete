<script lang="ts">
	import { resolve } from '$app/paths';
	import RouteError from '#lib/app/components/errors/RouteError.svelte';
</script>

<RouteError homeHref={resolve('/auth/(app)/dashboard')} homeLabel="Back to dashboard" />
