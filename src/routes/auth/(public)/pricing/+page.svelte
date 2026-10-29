<script lang="ts">
	import { authClient } from "#lib/modules/auth/client/client.js";
	import { goto } from "$app/navigation";
	import { PLANS as plans } from "#lib/app/plans.js";
	import { createCheckout } from "#lib/modules/billing/remote/checkout.remote.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const session = authClient.useSession();
	const isAuthed = $derived(!!$session.data?.user);
	const sessionLoading = $derived($session.isPending ?? false);

	const software = $derived(plans.filter((p) => ["signal", "gap", "direction", "full-diagnostic", "strategy"].includes(p.id)));
	const books = $derived(plans.filter((p) => !software.some((s) => s.id === p.id)));

	let loading = $state<string | null>(null);
	let error = $state<string | null>(null);
	// Required by the Consumer Contracts Regulations before the 14-day
	// cancellation right can be waived for immediate digital supply.
	let consent = $state(false);
	let guestPlanId = $state<string | null>(null);
	let guestEmail = $state("");

	const vatSuffix = $derived(
		!data.vatEnabled ? "" : data.vatDisplay === "inclusive" ? "incl. VAT" : "excl. VAT",
	);

	function formatPrice(price: number): string {
		return price === 0 ? "Free" : `£${price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	async function handleCheckout(planId: string, isFree: boolean) {
		if (sessionLoading) return;

		if (isFree) {
			goto(isAuthed ? "/auth/dashboard" : "/auth/sign-up?redirectTo=%2Fauth%2Fdashboard");
			return;
		}

		if (!isAuthed) {
			guestPlanId = planId;
			error = null;
			return;
		}

		await startCheckout(planId);
	}

	async function submitGuestCheckout(event: SubmitEvent) {
		event.preventDefault();
		if (!guestPlanId) return;
		await startCheckout(guestPlanId);
	}

	async function startCheckout(planId: string) {
		loading = planId;
		error = null;

		try {
			const result = await createCheckout({
				productId: planId,
				email: isAuthed ? undefined : guestEmail,
				cancellationConsent: true,
			});
			window.location.href = result.url;
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
</script>

<div class="min-h-screen bg-gray-50">
	<div class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
			<div class="text-center">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">Buy what you need</h1>
				<p class="text-xl text-gray-600 max-w-2xl mx-auto">
					Each product is a one-time purchase. No subscription, no mandatory
					call and no consultant sign-off.
				</p>
			</div>
		</div>
	</div>

	{#if error}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
				{error}
			</div>
		</div>
	{/if}

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<label
			class="flex gap-3 items-start rounded-lg border border-gray-200 bg-white p-4 mb-8 text-sm text-gray-700"
		>
			<input
				type="checkbox"
				bind:checked={consent}
				class="mt-0.5 h-4 w-4 shrink-0"
			/>
			<span>
				I understand that access begins immediately, and that I lose the
				14-day right to cancel once it does. This does not affect my rights if
				the product is faulty or not as described. See
				<a href="/auth/terms" class="underline">refund and cancellation terms</a>.
			</span>
		</label>

		<h2 class="text-2xl font-semibold text-gray-900 mb-2">Montsel software</h2>
		<p class="text-gray-600 mb-8">
			Self-service analysis you run yourself. Prices exclude VAT.
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each software as plan (plan.id)}
				<div
					class="rounded-lg border bg-white p-6 flex flex-col {plan.popular
						? 'border-gray-900 ring-2 ring-gray-900'
						: 'border-gray-200'}"
				>
					{#if plan.popular}
						<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
							Most complete
						</span>
					{/if}
					<h3 class="text-lg font-semibold text-gray-900">{plan.name}</h3>
					<p class="mt-2 text-sm text-gray-600">{plan.description}</p>
					<p class="mt-4 text-3xl font-bold text-gray-900">
						{formatPrice(plan.price)}
					</p>
					<p class="text-xs text-gray-500">
						One-time purchase{vatSuffix ? `, ${vatSuffix}` : ""}
					</p>
					<ul class="mt-4 space-y-2 text-sm text-gray-600 flex-1">
						{#each plan.features as feature}
							<li class="flex gap-2">
								<span aria-hidden="true">•</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
					<button
						type="button"
						class="mt-6 w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
						disabled={loading === plan.id || (plan.price > 0 && !consent)}
						onclick={() => handleCheckout(plan.id, plan.price === 0)}
					>
						{loading === plan.id ? "Opening checkout…" : plan.cta}
					</button>
				</div>
			{/each}
		</div>

		<h2 class="text-2xl font-semibold text-gray-900 mt-16 mb-2">Books and tools</h2>
		<p class="text-gray-600 mb-8">
			Lower-cost products for thinking and deciding. Independent of the software.
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each books as plan (plan.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-6 flex flex-col">
					<h3 class="text-lg font-semibold text-gray-900">{plan.name}</h3>
					<p class="mt-2 text-sm text-gray-600">{plan.description}</p>
					<p class="mt-4 text-2xl font-bold text-gray-900">
						{formatPrice(plan.price)}
					</p>
					{#if plan.price > 0}
						<p class="text-xs text-gray-500">
						One-time purchase{vatSuffix ? `, ${vatSuffix}` : ""}
					</p>
					{/if}
					<button
						type="button"
						class="mt-6 w-full rounded-md border border-gray-900 px-4 py-2 text-gray-900 hover:bg-gray-50 disabled:opacity-50"
						disabled={loading === plan.id || (plan.price > 0 && !consent)}
						onclick={() => handleCheckout(plan.id, plan.price === 0)}
					>
						{loading === plan.id ? "Opening checkout…" : plan.cta}
					</button>
				</div>
			{/each}
		</div>

		<div class="mt-16 rounded-lg border border-gray-200 bg-white p-6">
			<h2 class="text-xl font-semibold text-gray-900">Direct strategic support</h2>
			<p class="mt-2 text-gray-600">
				Langfell is a separate, founder-led consultancy for decisions that need
				investigation, challenge and judgement. Engagements are scoped by
				proposal: Strategic Diagnostic £12,500, Strategic Foundation from
				£15,000, and an Integrated Strategic Engagement at a £35,000 reference.
			</p>
			<a href="/auth/contact" class="mt-4 inline-block text-gray-900 underline">
				Enquire about working with Langfell
			</a>
		</div>

		<div class="mt-12 space-y-6">
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Is this a subscription?</h3>
				<p class="text-gray-600 mt-2">
					No. Every product is a single payment. You are not enrolled in
					anything recurring.
				</p>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">Do I need a call?</h3>
				<p class="text-gray-600 mt-2">
					No. The software products are self-service. Langfell consultancy is
					the only route that involves speaking to Rob.
				</p>
			</div>
			<div>
				<h3 class="text-lg font-semibold text-gray-900">What if a product does not fit my situation?</h3>
				<p class="text-gray-600 mt-2">
					Direction needs a proposal you already have. If you do not have one,
					the checkout will tell you before you pay. If the product cannot be
					delivered, you are refunded in full. See
					<a href="/auth/terms" class="underline">refund and cancellation terms</a>.
				</p>
			</div>
		</div>
	</div>
</div>

{#if guestPlanId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<form
			class="w-full max-w-md rounded-lg bg-white p-6"
			onsubmit={submitGuestCheckout}
		>
			<h2 class="text-lg font-semibold text-gray-900">Where should we send your receipt?</h2>
			<p class="mt-1 text-sm text-gray-600">
				We will create your account and email you a sign-in link.
			</p>
			<label class="mt-4 block text-sm font-medium text-gray-700" for="guest-email">
				Email address
			</label>
			<input
				id="guest-email"
				type="email"
				required
				bind:value={guestEmail}
				class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
				autocomplete="email"
			/>
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					class="flex-1 rounded-md border border-gray-300 px-4 py-2"
					onclick={() => (guestPlanId = null)}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="flex-1 rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
					disabled={loading !== null}
				>
					{loading ? "Opening checkout…" : "Continue to payment"}
				</button>
			</div>
		</form>
	</div>
{/if}
