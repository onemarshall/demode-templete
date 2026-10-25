<script lang="ts">
	import SecurityTab from '#lib/modules/auth/features/profile/components/tabs/SecurityTab.svelte';
	import PageHeader from '#lib/app/shell/page-header.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Sign-in &amp; security</title></svelte:head>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="Sign-in & security" description="Manage how you sign in and protect your account." />
	<SecurityTab user={data.user} session={data.session} accounts={data.accounts} />
</div>
