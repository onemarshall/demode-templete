<script lang="ts">
	import AuthMagicLinkForm from '$lib/components/forms/auth/AuthMagicLinkForm.svelte';

	interface PageData {
		email?: string;
	}
	let { data }: { data?: PageData } = $props();
</script>

<AuthMagicLinkForm mode="sign-in" initialEmail={data?.email ?? ''} />
