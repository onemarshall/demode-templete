<!-- src/routes/auth/(public)/sign-up/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { signup } from '#lib/modules/auth/remote/auth.remote.js';
	import AuthForm from '#lib/modules/auth/components/forms/auth/AuthForm.svelte';
	import { safeRedirect } from '#lib/modules/auth/shared/redirect.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const redirectTo = $derived(
		safeRedirect(page.url.searchParams.get('redirectTo'), data.defaultRedirect)
	);
</script>

<AuthForm mode="sign-up" formAction={signup} {redirectTo} />
