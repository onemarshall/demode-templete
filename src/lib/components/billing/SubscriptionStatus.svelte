<script lang="ts">
	import { authClient } from "#lib/auth-client.js";
	import { getPlan } from "#lib/billing/plans.js";

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

<div class="rounded-lg border border-gray-200 bg-white p-6">
	<h2 class="text-lg font-semibold text-gray-900 mb-4">
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
			<button
				onclick={loadSubscriptionData}
				class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
			>
				Retry
			</button>
		</div>
	{:else if subscription}
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<span class="text-sm text-gray-600">Status</span>
				<span
					class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
					{subscription.status === 'active'
						? 'bg-green-100 text-green-800'
						: subscription.status === 'trialing'
							? 'bg-blue-100 text-blue-800'
							: 'bg-gray-100 text-gray-800'}"
				>
					{subscription.status}
				</span>
			</div>

			{#if enrichedProduct?.name}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Plan</span>
					<span class="text-sm font-medium text-gray-900"
						>{enrichedProduct.name}</span
					>
				</div>
			{/if}

			{#if enrichedProduct?.price != null && enrichedProduct?.currency}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Price</span>
					<span class="text-sm font-medium text-gray-900">
						{new Intl.NumberFormat(undefined, {
							style: "currency",
							currency: enrichedProduct.currency.toUpperCase(),
						}).format(enrichedProduct.price / 100)}
					</span>
				</div>
			{/if}

			{#if subscription.periodEnd}
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Renews</span>
					<span class="text-sm font-medium text-gray-900"
						>{formatDate(subscription.periodEnd)}</span
					>
				</div>
			{/if}

			<div class="border-t border-gray-200 pt-4 mt-4">
				<div class="flex gap-3">
					<button
						onclick={openPortal}
						class="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
					>
						Manage
					</button>
					{#if subscription.status === "active"}
						<button
							onclick={handleCancel}
							class="flex-1 py-2 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-md transition-colors"
						>
							Cancel
						</button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center py-8">
			<p class="text-gray-600 mb-4">No active subscription</p>
			<a
				href="/subscribe"
				class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				View Plans
			</a>
		</div>
	{/if}
</div>
