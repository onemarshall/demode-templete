<script lang="ts">
	import { authClient } from "#lib/auth-client.js";
	import { getPlan } from "#lib/billing/plans.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Spinner } from "$lib/components/ui/spinner/index.js";

import * as Card from '#lib/components/ui/card/index.js';
	
	interface SubscriptionData {
		status: string;
		product: {
			id?: string;
			name?: string;
			price?: number;
			currency?: string;
		};
		periodStart?: string | null;
		periodEnd?: string | null;
		cancelAtPeriodEnd?: boolean;
	}

	let { initial }: { initial?: SubscriptionData | null } = $props();

	const session = authClient.useSession();
	const isAuthed = $derived(!!$session.data?.user);
	const sessionLoading = $derived($session.isPending ?? false);

	// svelte-ignore state_referenced_locally
	let loading = $state(false);
	let error = $state<string | null>(null);
	// svelte-ignore state_referenced_locally
	let subscription = $state<SubscriptionData | null>(initial ?? null);
	// svelte-ignore state_referenced_locally
	let loadedOnce = $state(!!initial);

	const enrichedProduct = $derived.by(() => {
		const p = subscription?.product;
		if (!p) return null;
		const fallback = getPlan(p.id);
		return {
			name: p.name ?? fallback?.name,
			price: p.price ?? fallback?.priceMinorUnits,
			currency: p.currency ?? fallback?.currency,
		};
	});

	$effect(() => {
		if (sessionLoading) return;
		if (!isAuthed) {
			loading = false;
			subscription = null;
			error = null;
			return;
		}
		if (loadedOnce) return;
		loadedOnce = true;
		loadSubscriptionData();
	});

	async function loadSubscriptionData() {
		loading = true;
		error = null;

		try {
			const { data: subData, error: subError } =
				await authClient.creem.retrieveSubscription();
			if (subError) {
				const status = (subError as { status?: number }).status;
				if (status === 401 || status === 403) {
					subscription = null;
				} else if (subError.message?.includes("not found")) {
					subscription = null;
				} else {
					error = subError.message;
				}
			} else if (subData) {
				subscription = subData as SubscriptionData;
			}
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to load subscription";
		} finally {
			loading = false;
		}
	}

	async function handleCancel() {
		if (!confirm("Are you sure you want to cancel your subscription?")) {
			return;
		}

		loading = true;

		try {
			const { data, error: cancelError } =
				await authClient.creem.cancelSubscription();

			if (cancelError) {
				error = cancelError.message ?? "Failed to cancel subscription";
				return;
			}

			if (data?.success) {
				await loadSubscriptionData();
			}
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to cancel subscription";
		} finally {
			loading = false;
		}
	}

	async function openPortal() {
		const { error: portalError } = await authClient.creem.createPortal({
			redirect: true
		});

		if (portalError) {
			error = portalError.message ?? "Failed to open portal";
		}
	}

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return "N/A";
		return new Date(dateStr).toLocaleDateString();
	}
</script>

<Card.Root>
	<Card.Content class="space-y-2">
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
		Subscription Status
	</h2>
	{#if !subscription && (sessionLoading || loading)}
		<div class="flex items-center justify-center py-8">
			<div
				class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
			></div>
		</div>
	{:else if !subscription && !isAuthed}
		<div class="py-4 text-center">
			<p class="text-sm text-gray-600">
				<a href="/auth/sign-in" class="text-blue-600 hover:underline"
					>Sign in</a
				> to view your subscription.
			</p>
		</div>
	{:else if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-md">
			<p class="text-sm text-red-700">{error}</p>
			<Button
				onclick={loadSubscriptionData}
				variant="link"
				size="sm"
				class="mt-2 text-red-600 hover:text-red-800"
			>
				<Spinner data-icon="inline-start" /> Retry
			</Button>
		</div>
	{:else if subscription}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-600 dark:text-gray-100">Status</span>
				<span
					class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
					{subscription.status === 'active'
						? 'bg-green-100 text-green-800'
						: subscription.status === 'trialing'
							? 'bg-blue-100 text-blue-800'
							: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'}"
				>
					{subscription.status}
				</span>
			</div>

			{#if enrichedProduct?.name}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600 dark:text-gray-100">Plan</span>
					<span class="text-sm font-medium text-gray-900 dark:text-gray-100"
						>{enrichedProduct.name}</span
					>
				</div>
			{/if}

			{#if enrichedProduct?.price != null && enrichedProduct?.currency}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600 dark:text-gray-100">Price</span>
					<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
						{new Intl.NumberFormat(undefined, {
							style: "currency",
							currency: enrichedProduct.currency.toUpperCase(),
						}).format(enrichedProduct.price / 100)}
					</span>
				</div>
			{/if}

			{#if subscription.periodEnd}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600 dark:text-gray-100">Renews</span>
					<span class="text-sm font-medium text-gray-900 dark:text-gray-100"
						>{formatDate(subscription.periodEnd)}</span
					>
				</div>
			{/if}

			<div class="border-t border-gray-200 pt-4 mt-4">
				<div class="flex gap-3">
					<Button onclick={openPortal} class="flex-1" variant="outline">
					<Spinner data-icon="inline-start" /> Manage
				</Button>

					{#if subscription.status === "active"}
						<Button
							onclick={handleCancel}
							variant="destructive"
							class="flex-1"
						>
							Cancel
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center py-8">
			<p class="text-gray-600 mb-4">No active subscription</p>
			<Button href="/subscribe">View Plans</Button>
		</div>
	{/if}
	</Card.Content>
</Card.Root>

