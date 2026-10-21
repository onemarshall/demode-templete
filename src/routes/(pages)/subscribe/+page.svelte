<script lang="ts">
	import { authClient } from "#lib/auth-client.js";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	// Intentionally captured once: the product ID is user-editable after load.
	// svelte-ignore state_referenced_locally
	let productId = $state(page.url.searchParams.get('productId') ?? "prod_default");
	let discountCode = $state("");

	async function handleCheckout() {
		loading = true;
		error = null;

		try {
			const { data: checkoutData, error: checkoutError } =
				await authClient.creem.createCheckout({
					productId,
					successUrl: "/dashboard",
					cancelUrl: "/subscribe",
					...(discountCode ? { discountCode } : {}),
				});

			if (checkoutError) {
				error = checkoutError.message ?? "Failed to create checkout";
				return;
			}

			if (checkoutData?.url) {
				// Redirect to Creem checkout
				window.location.href = checkoutData.url;
			} else {
				error = "No checkout URL returned";
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

	async function openCustomerPortal() {
		loading = true;
		error = null;

		try {
			const { data: portalData, error: portalError } =
				await authClient.creem.createPortal({ redirect: true });

			if (portalError) {
				error = portalError.message ?? "Failed to open portal";
				return;
			}

			// redirect: true makes the client navigate to the portal URL
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
		const { data: accessData } = await authClient.creem.hasAccessGranted();
		return accessData?.hasAccessGranted ?? false;
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

			<div>
				<label
					for="discount"
					class="block text-sm font-medium text-gray-700 mb-1"
				>
					Discount Code (optional)
				</label>
				<input
					id="discount"
					type="text"
					bind:value={discountCode}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="e.g., LAUNCH50"
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
					href="https://creem.io"
					target="_blank"
					class="text-blue-600 hover:underline">Creem</a
				>
			</p>
		</div>
	</div>
</div>
