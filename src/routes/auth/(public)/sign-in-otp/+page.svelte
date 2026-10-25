<script lang="ts">
	import AuthOTPForm from '#lib/modules/auth/features/email-otp/components/AuthOTPForm.svelte';

	interface PageData {
		email?: string;
	}
	let { data }: { data?: PageData } = $props();
</script>

<AuthOTPForm initialEmail={data?.email ?? ''} />
