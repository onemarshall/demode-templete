<script lang="ts">
	import { resolve } from '$app/paths';
	import RouteError from '#lib/components/errors/RouteError.svelte';
</script>

<RouteError homeHref={resolve('/(admin)/admin/users')} homeLabel="Back to admin" />
