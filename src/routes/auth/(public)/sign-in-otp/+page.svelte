<script lang="ts">
	import AuthOTPForm from '#lib/components/forms/auth/AuthOTPForm.svelte';

	interface PageData {
		email?: string;
	}
	let { data }: { data?: PageData } = $props();
</script>

<AuthOTPForm initialEmail={data?.email ?? ''} />
