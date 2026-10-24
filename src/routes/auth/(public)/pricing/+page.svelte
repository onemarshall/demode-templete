<script lang="ts">
	import { authClient } from "#lib/auth-client.js";
	import { goto } from "$app/navigation";
	import { PLANS as plans } from "#lib/billing/plans.js";
	import { createGuestCheckout } from "#lib/remote/checkout.remote.js";

	const session = authClient.useSession();
	const isAuthed = $derived(!!$session.data?.user);
	const sessionLoading = $derived($session.isPending ?? false);

	let loading = $state<string | null>(null);
	let error = $state<string | null>(null);
	let currentPlan = $state<string | null>(null);
	let guestModalPlanId = $state<string | null>(null);
	let guestEmail = $state("");

	$effect(() => {
		if (!isAuthed) {
			currentPlan = null;
			return;
		}
		(async () => {
			const { data } = await authClient.creem.retrieveSubscription();
			if (data?.product?.id) {
				currentPlan = data.product.id;
			}
		})();
	});

	async function handleCheckout(planId: string, isFree: boolean) {
		if (sessionLoading) return;

		if (isFree) {
			if (!isAuthed) {
				goto(`/auth/sign-up?redirectTo=%2Fauth%2Fdashboard`);
				return;
			}
			goto("/auth/dashboard");
			return;
		}

		if (!isAuthed) {
			guestModalPlanId = planId;
			error = null;
			return;
		}

		loading = planId;
		error = null;

		try {
			const { data, error: checkoutError } =
				await authClient.creem.createCheckout({
					productId: planId,
					successUrl: "/auth/profile?subscription=success",
					cancelUrl: "/pricing?subscription=canceled",
				});

			if (checkoutError) {
				error = checkoutError.message ?? "Failed to create checkout";
				return;
			}

			if (data?.url) {
				window.location.href = data.url;
			} else {
				error = "No checkout URL returned";
			}
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "An unexpected error occurred";
		} finally {
			loading = null;
		}
	}

	async function submitGuestCheckout(event: SubmitEvent) {
		event.preventDefault();
		if (!guestModalPlanId) return;
		await startCheckout();
	}

	async function startCheckout() {
		if (!guestModalPlanId) return;
		const planId = guestModalPlanId;
		loading = planId;
		error = null;

		try {
			const data = await createGuestCheckout({
				productId: planId,
				email: guestEmail,
				successUrl: "/auth/profile?subscription=success",
				cancelUrl: "/pricing?subscription=canceled",
			});

			window.location.href = data.url;
		} catch (err) {
			error =
				err && typeof err === "object" && "body" in err
					? String((err.body as { message?: string }).message ?? "Failed to start checkout")
					: err instanceof Error
						? err.message
						: "An unexpected error occurred";
		} finally {
			loading = null;
		}
	}

	async function openPortal() {
		if (!isAuthed) {
			goto("/auth/sign-in?redirectTo=%2Fpricing");
			return;
		}
		const { error: portalError } = await authClient.creem.createPortal({
			redirect: true
		});
		if (portalError) {
			error = portalError.message ?? "Failed to open portal";
		}
	}

	function formatPrice(price: number): string {
		return price === 0 ? "Free" : `$${price}`;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
			<div class="text-center">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">
					Simple, transparent pricing
				</h1>
				<p class="text-xl text-gray-600 max-w-2xl mx-auto">
					Choose the perfect plan for your needs. All plans include
					core authentication features. Upgrade or downgrade anytime.
				</p>
			</div>
		</div>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="flex">
					<div class="shrink-0">
						<svg
							class="h-5 w-5 text-red-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Pricing Cards -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
			{#each plans as plan}
				<div
					class="relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 {plan.popular
						? 'border-blue-500'
						: 'border-transparent'}"
				>
					<!-- Popular Badge -->
					{#if plan.popular}
						<div
							class="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg"
						>
							MOST POPULAR
						</div>
					{/if}

					<div class="p-6">
						<!-- Plan Header -->
						<div class="mb-6">
							<h3 class="text-2xl font-bold text-gray-900">
								{plan.name}
							</h3>
							<p class="text-gray-600 mt-1">{plan.description}</p>
						</div>

						<!-- Price -->
						<div class="mb-6">
							<div class="flex items-baseline">
								<span class="text-5xl font-bold text-gray-900"
									>{formatPrice(plan.price)}</span
								>
								{#if plan.period}
									<span class="text-gray-500 ml-2"
										>/{plan.period}</span
									>
								{/if}
							</div>
							{#if plan.trial}
								<p class="text-sm text-green-600 mt-1">
									{plan.trial}
								</p>
							{/if}
						</div>

						<!-- Features -->
						<ul class="space-y-3 mb-8">
							{#each plan.features as feature}
								<li class="flex items-start">
									<svg
										class="h-5 w-5 text-green-500 shrink-0 mr-3 mt-0.5"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="text-sm text-gray-600"
										>{feature}</span
									>
								</li>
							{/each}
						</ul>

						<!-- CTA Button -->
						<button
							onclick={() =>
								handleCheckout(plan.id, plan.price === 0)}
							disabled={loading === plan.id ||
								currentPlan === plan.id}
							class="w-full py-3 px-4 rounded-lg font-semibold transition-colors {plan.popular
								? 'bg-blue-600 hover:bg-blue-700 text-white'
								: plan.price === 0
									? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
									: 'bg-gray-900 hover:bg-gray-800 text-white'}
							{loading === plan.id || currentPlan === plan.id
								? 'opacity-50 cursor-not-allowed'
								: ''}"
						>
							{#if loading === plan.id}
								<span class="flex items-center justify-center">
									<svg
										class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Processing...
								</span>
							{:else if currentPlan === plan.id}
								Current Plan
							{:else}
								{plan.cta}
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Current Subscription -->
	{#if currentPlan}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold text-blue-900">
							Active Subscription
						</h3>
						<p class="text-blue-700 mt-1">
							You're currently on a paid plan. Manage your billing
							settings below.
						</p>
					</div>
					<button
						onclick={openPortal}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
					>
						Manage Billing
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Guest Checkout Modal -->
	{#if guestModalPlanId}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
				<h2 class="text-xl font-bold text-gray-900">
					Continue to payment
				</h2>
				<p class="mt-1 text-sm text-gray-600">
					Enter your email — you'll go straight to the secure Creem
					checkout. We'll also send you a sign-in link so you can
					manage your subscription after paying.
				</p>
				<form onsubmit={submitGuestCheckout} class="mt-4 space-y-4">
					<label class="block">
						<span class="text-sm font-medium text-gray-700"
							>Email</span
						>
						<input
							type="email"
							bind:value={guestEmail}
							required
							autocomplete="email"
							class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</label>
					<div class="flex justify-end gap-2">
						<button
							type="button"
							onclick={() => {
								guestModalPlanId = null;
								guestEmail = "";
							}}
							class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading === guestModalPlanId}
							class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{loading === guestModalPlanId
								? "Starting…"
								: "Continue"}
						</button>
					</div>
					<p class="text-center text-xs text-gray-500">
						Already have an account?
						<a
							href="/auth/sign-in?redirectTo=%2Fpricing"
							class="text-blue-600 hover:underline">Sign in</a
						>
					</p>
				</form>
			</div>
		</div>
	{/if}

	<!-- FAQ Section -->
	<div
		class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200"
	>
		<h2 class="text-3xl font-bold text-gray-900 text-center mb-8">
			Frequently Asked Questions
		</h2>
		<div class="space-y-6">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">
					Can I upgrade or downgrade anytime?
				</h3>
				<p class="text-gray-600 mt-2">
					Yes, changes take effect at the next billing cycle. Prorated
					credits are applied automatically.
				</p>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">
					What happens if I exceed my limits?
				</h3>
				<p class="text-gray-600 mt-2">
					We'll notify you at 80% and 100% usage. You can upgrade
					instantly or contact sales for custom limits.
				</p>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">
					Is there a refund policy?
				</h3>
				<p class="text-gray-600 mt-2">
					30-day money-back guarantee for all paid plans. No questions
					asked.
				</p>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">
					Do you offer annual billing?
				</h3>
				<p class="text-gray-600 mt-2">
					Yes! Annual billing gives you 2 months free. Contact us for
					details.
				</p>
			</div>
		</div>
	</div>
</div>
