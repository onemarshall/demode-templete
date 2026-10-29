<script lang="ts">
	import { authClient } from "#lib/modules/auth/client/client.js";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	// Intentionally captured once: the product ID is user-editable after load.
	// svelte-ignore state_referenced_locally
	let productId = $state(page.url.searchParams.get('productId') ?? "pro");

	async function handleCheckout() {
		loading = true;
		error = null;

		try {
			const { error: checkoutError } = await authClient.subscription.upgrade({
				plan: productId,
				successUrl: "/dashboard",
				cancelUrl: "/subscribe",
				disableRedirect: false,
			});

			if (checkoutError) {
				error = checkoutError.message ?? "Failed to create checkout";
			}
			// On success the client navigates to Stripe Checkout.
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "An unexpected error occurred";
		} finally {
			loading = false;
		}
	}

	async function openCustomerPortal() {
		loading = true;
		error = null;

		try {
			const { error: portalError } =
				await authClient.subscription.billingPortal({ returnUrl: "/subscribe" });

			if (portalError) {
				error = portalError.message ?? "Failed to open portal";
				return;
			}
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "An unexpected error occurred";
		} finally {
			loading = false;
		}
	}

	async function checkAccess() {
		const { data } = await authClient.subscription.list({ query: {} });
		return (
			data?.some(
				(subscription) =>
					subscription.status === "active" || subscription.status === "trialing"
			) ?? false
		);
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
	<div class="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Subscribe</h1>
		<p class="text-gray-600 mb-6">Choose your plan and complete checkout</p>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
				<p class="text-sm text-red-700">{error}</p>
			</div>
		{/if}

		<div class="space-y-4">
			<div>
				<label
					for="productId"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Product ID
				</label>
				<input
					id="productId"
					type="text"
					bind:value={productId}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Enter product ID"
				/>
			</div>

			<button
				onclick={handleCheckout}
				disabled={loading || !productId}
				class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
			>
				{loading ? "Processing..." : "Subscribe Now"}
			</button>

			<div class="border-t border-gray-200 my-4"></div>

			<button
				onclick={openCustomerPortal}
				disabled={loading}
				class="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 font-medium rounded-md transition-colors"
			>
				Manage Subscription
			</button>
		</div>

		<div class="mt-6 text-center text-sm text-gray-500">
			<p>
				Powered by <a
					href="https://stripe.com"
					target="_blank"
					class="text-blue-600 hover:underline">Stripe</a
				>
			</p>
		</div>
	</div>
</div>
