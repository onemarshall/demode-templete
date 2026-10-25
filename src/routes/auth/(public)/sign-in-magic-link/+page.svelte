<script lang="ts">
	import AuthMagicLinkForm from '#lib/modules/auth/features/magic-link/components/AuthMagicLinkForm.svelte';

	interface PageData {
		email?: string;
	}
	let { data }: { data?: PageData } = $props();
</script>

<AuthMagicLinkForm mode="sign-in" initialEmail={data?.email ?? ''} />
