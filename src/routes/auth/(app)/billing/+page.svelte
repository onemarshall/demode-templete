<!-- src/routes/auth/(app)/billing/+page.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import SubscriptionStatus from '#lib/components/billing/SubscriptionStatus.svelte';
	import CustomerPortalButton from '#lib/components/billing/CustomerPortalButton.svelte';
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';

	let { data } = $props();
</script>

<div class="mx-auto w-full max-w-4xl space-y-6">
	<PageHeader title="Subscription" description="Manage your plan and billing details." />

	<div class="space-y-4">
		<SubscriptionStatus initial={data.subscription} />
		<!-- <Card.Root>
			<Card.Content class="space-y-2 pt-6">
				<p class="text-sm font-medium">Billing</p>
				<CustomerPortalButton />
			</Card.Content>
		</Card.Root> -->
	</div>
</div>
