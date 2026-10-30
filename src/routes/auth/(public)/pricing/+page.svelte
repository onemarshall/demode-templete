<script lang="ts">
	import { authClient } from "#lib/modules/auth/client/client.js";
	import { goto } from "$app/navigation";
	import { PLANS as plans } from "#lib/app/plans.js";
	import { createCheckout, requestInvoice } from "#lib/modules/billing/remote/checkout.remote.js";
	import { checkDiagnosticEligibility } from "#lib/modules/billing/remote/eligibility.remote.js";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const session = authClient.useSession();
	const isAuthed = $derived(!!$session.data?.user);
	const sessionLoading = $derived($session.isPending ?? false);

	const released = $derived(new Set(data.releasedProducts));

	const software = $derived(plans.filter((p) => ["signal", "gap", "direction", "full-diagnostic", "strategy"].includes(p.id)));
	const books = $derived(plans.filter((p) => !software.some((s) => s.id === p.id)));

	let loading = $state<string | null>(null);
	let error = $state<string | null>(null);
	// Required by the Consumer Contracts Regulations before the 14-day
	// cancellation right can be waived for immediate digital supply.
	let consent = $state(false);
	let guestPlanId = $state<string | null>(null);
	let guestEmail = $state("");
	// Gap and Direction need a short eligibility check before checkout. It is
	// repeated at engagement start because sector coverage can change.
	let eligibility = $state<
		Record<string, { website: string; sectorRef: string; hasProposal: boolean }>
	>(
		Object.fromEntries(
			["gap", "direction"].map((id) => [
				id,
				{ website: "", sectorRef: "", hasProposal: false },
			]),
		),
	);
	let eligibilityResult = $state<
		Record<string, { result: string; reasons: string[] } | null>
	>({});
	let checking = $state<string | null>(null);
	const needsEligibility = (planId: string) => planId === "gap" || planId === "direction";
	const eligibilityComplete = (planId: string) => {
		if (!needsEligibility(planId)) return true;
		const entry = eligibility[planId];
		return Boolean(
			entry?.website &&
				entry?.sectorRef &&
				(planId !== "direction" || entry.hasProposal) &&
				eligibilityResult[planId]?.result === "eligible",
		);
	};

	async function checkEligibilityFor(planId: string) {
		const entry = eligibility[planId];
		if (!entry) return;
		checking = planId;
		eligibilityResult[planId] = null;
		try {
			const result = await checkDiagnosticEligibility({
				productId: planId,
				website: entry.website,
				sectorRef: entry.sectorRef,
				hasProposal: entry.hasProposal,
			});
			eligibilityResult[planId] = {
				result: result.result,
				reasons: result.reasons,
			};
		} catch (cause) {
			eligibilityResult[planId] = {
				result: "ineligible",
				reasons: [
					cause instanceof Error
						? cause.message
						: "Eligibility could not be checked.",
				],
			};
		} finally {
			checking = null;
		}
	}

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

	async function startInvoice(planId: string) {
		loading = planId;
		error = null;
		try {
			const entry = eligibility[planId];
			const result = await requestInvoice({
				productId: planId,
				email: isAuthed ? undefined : guestEmail,
				cancellationConsent: true,
				...(needsEligibility(planId) && entry
					? {
							website: entry.website,
							sectorRef: entry.sectorRef,
							hasProposal: entry.hasProposal,
						}
					: {}),
			});
			// The order page carries the invoice number, amount, status and a link
			// to the hosted invoice. Sending the buyer straight to Stripe would
			// lose the order context.
			goto(`/auth/purchase/success?order=${result.orderId}`);
		} catch (err) {
			error =
				err && typeof err === "object" && "body" in err
					? String((err.body as { message?: string }).message ?? "Failed to request invoice")
					: err instanceof Error
						? err.message
						: "An unexpected error occurred";
		} finally {
			loading = null;
		}
	}

	async function startCheckout(planId: string) {
		loading = planId;
		error = null;

		try {
			const entry = eligibility[planId];
			const result = await createCheckout({
				productId: planId,
				email: isAuthed ? undefined : guestEmail,
				cancellationConsent: true,
				...(needsEligibility(planId) && entry
					? {
							website: entry.website,
							sectorRef: entry.sectorRef,
							hasProposal: entry.hasProposal,
						}
					: {}),
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
					{#if plan.payByBankPreferred && data.payByBankAvailable}
						<p class="mt-1 text-xs text-gray-500">
							Pay securely from your bank account, or by card.
						</p>
					{/if}
					<ul class="mt-4 space-y-2 text-sm text-gray-600 flex-1">
						{#each plan.features as feature}
							<li class="flex gap-2">
								<span aria-hidden="true">•</span>
								<span>{feature}</span>
							</li>
						{/each}
					</ul>
					{#if needsEligibility(plan.id)}
						<div class="mt-4 flex flex-col gap-2 rounded-md border border-gray-200 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Eligibility</p>
							<input
								class="h-9 rounded-md border border-gray-300 px-3 text-sm"
								type="url"
								placeholder="https://your-site.com"
								bind:value={eligibility[plan.id].website}
								oninput={() => (eligibilityResult[plan.id] = null)}
								aria-label={`Website for ${plan.name}`}
							/>
							<select
								class="h-9 rounded-md border border-gray-300 px-3 text-sm"
								bind:value={eligibility[plan.id].sectorRef}
								onchange={() => (eligibilityResult[plan.id] = null)}
								aria-label={`Sector for ${plan.name}`}
							>
								<option value="">Choose an approved sector</option>
								{#each data.sectors as sector (sector.ref)}
									<option value={sector.ref}>{sector.name}</option>
								{/each}
							</select>
							{#if plan.id === "direction"}
								<label class="flex items-start gap-2 text-xs text-gray-600">
									<input type="checkbox" bind:checked={eligibility[plan.id].hasProposal}
									onchange={() => (eligibilityResult[plan.id] = null)} />
									I have a proposed direction ready to test.
								</label>
							{/if}
							<button
								type="button"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
								disabled={checking === plan.id ||
									!eligibility[plan.id].website ||
									!eligibility[plan.id].sectorRef ||
									(plan.id === "direction" && !eligibility[plan.id].hasProposal)}
								onclick={() => checkEligibilityFor(plan.id)}
							>
								{checking === plan.id ? "Checking…" : "Check eligibility"}
							</button>
							{#if eligibilityResult[plan.id]}
								<p
									class={`text-xs ${eligibilityResult[plan.id]?.result === "eligible" ? "text-green-700" : "text-red-600"}`}
								>
									{eligibilityResult[plan.id]?.result === "eligible"
										? "Eligible to buy with these inputs."
										: eligibilityResult[plan.id]?.reasons.join(" ")}
								</p>
							{/if}
							{#if !data.eligibilityAvailable}
								<p class="text-xs text-red-600">Eligibility cannot be confirmed right now.</p>
							{:else if data.sectors.length === 0}
								<p class="text-xs text-red-600">No approved sector research is available yet.</p>
							{/if}
						</div>
					{/if}
					{#if released.has(plan.id)}
						<button
							type="button"
							class="mt-6 w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
							disabled={loading === plan.id || (plan.price > 0 && !consent) || !eligibilityComplete(plan.id)}
							onclick={() => handleCheckout(plan.id, plan.price === 0)}
						>
							{loading === plan.id ? "Opening checkout…" : plan.cta}
						</button>
					{:else}
						<p class="mt-6 rounded-md border border-gray-200 px-4 py-2 text-center text-sm text-gray-500">
							Coming soon
						</p>
					{/if}
					{#if released.has(plan.id) && plan.invoiceAvailable}
						<button
							type="button"
							class="mt-2 w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
							disabled={loading === plan.id || !consent || !eligibilityComplete(plan.id)}
							onclick={() => startInvoice(plan.id)}
						>
							{loading === plan.id ? "Preparing invoice…" : "Request an invoice"}
						</button>
					{/if}
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
					{#if plan.payByBankPreferred && data.payByBankAvailable}
						<p class="mt-1 text-xs text-gray-500">
							Pay securely from your bank account, or by card.
						</p>
					{/if}
					{/if}
					{#if released.has(plan.id)}
						<button
							type="button"
							class="mt-6 w-full rounded-md border border-gray-900 px-4 py-2 text-gray-900 hover:bg-gray-50 disabled:opacity-50"
							disabled={loading === plan.id || (plan.price > 0 && !consent)}
							onclick={() => handleCheckout(plan.id, plan.price === 0)}
						>
							{loading === plan.id ? "Opening checkout…" : plan.cta}
						</button>
					{:else}
						<p class="mt-6 rounded-md border border-gray-200 px-4 py-2 text-center text-sm text-gray-500">
							Coming soon
						</p>
					{/if}
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
