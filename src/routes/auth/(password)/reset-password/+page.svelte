<script lang="ts">
	import { page } from '$app/state';
	import AuthPasswordSetForm from '$lib/components/forms/auth/AuthPasswordSetForm.svelte';

	let token = $derived(page.url.searchParams.get('token'));
</script>

<AuthPasswordSetForm mode="reset" {token} />
