<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import SubscriptionStatus from '#lib/modules/billing/components/SubscriptionStatus.svelte';
	import PageHeader from '#lib/app/shell/page-header.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Subscription &amp; billing</title></svelte:head>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="Subscription & billing" description="Manage your plan and billing details." />
	<div>
		<Button variant="outline" href="/auth/pricing">Compare plans</Button>
	</div>
	<SubscriptionStatus initial={data.subscription} />
</div>
