<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const vatLine = $derived(
		data.vatEnabled
			? `Prices are shown ${data.vatDisplay === 'inclusive' ? 'including' : 'excluding'} VAT at ${data.vatRate}%.`
			: 'Prices are shown excluding VAT. VAT is added where applicable.',
	);
</script>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
		<h1 class="text-3xl font-bold text-gray-900">Refund and cancellation terms</h1>
		<p class="mt-2 text-sm text-gray-500">Last updated 29 October 2026</p>

		<div class="mt-8 space-y-8 text-gray-700">
			<section>
				<h2 class="text-xl font-semibold text-gray-900">Your 14-day right to cancel</h2>
				<p class="mt-2">
					If you are a consumer in the UK or EU, you normally have 14 days from
					the day of purchase to cancel a distance contract and receive a full
					refund.
				</p>
				<p class="mt-2">
					Digital content is different. That right is lost once supply begins,
					but only if you expressly agreed to immediate access and acknowledged
					that you would lose the right. We ask for that agreement at checkout,
					before payment. If you did not give it, your right to cancel stands.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">What happens after you cancel</h2>
				<p class="mt-2">
					Where the right applies, we refund the full amount to the original
					payment method within 14 days of your cancellation. We do not deduct
					for card fees. Access to the product is withdrawn when the refund is
					processed.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">If we cannot deliver</h2>
				<p class="mt-2">
					Some products need something from you before they can run. Direction
					needs a proposal you already have. If you buy one and it turns out the
					product cannot be delivered, we stop rather than produce a verdict on
					something we invented, and we refund you in full.
				</p>
				<p class="mt-2">
					The same applies if a product fails to run or the output is materially
					defective. Tell us and we will fix it or refund it.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">Faulty or not as described</h2>
				<p class="mt-2">
					Nothing here reduces your statutory rights under the Consumer Rights
					Act 2015 or equivalent law. Digital content must be as described, fit
					for purpose and of satisfactory quality. If it is not, you are entitled
					to a repair or replacement, a price reduction, or a refund.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">Disagreeing with a finding</h2>
				<p class="mt-2">
					A diagnostic can tell you something you did not want to hear. A
					conclusion you disagree with is not a defect, and it is not grounds for
					a refund. If the reasoning is wrong on the evidence, that is a defect
					and we will correct it.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">Prices, VAT and payment</h2>
				<p class="mt-2">{vatLine}</p>
				<p class="mt-2">
					Each product is a single payment. Nothing is recurring, and you are not
					enrolled in a subscription.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">How to cancel or ask for a refund</h2>
				<p class="mt-2">
					Email <a href="mailto:{data.contactEmail}" class="underline">{data.contactEmail}</a>
					with the email address you used to buy and, if you have it, the Stripe
					receipt. A clear statement that you want to cancel is enough; you do not
					need a form.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900">Consultancy is different</h2>
				<p class="mt-2">
					Langfell consultancy engagements are governed by the terms in the
					individual proposal and engagement documents, not by this page. Where
					the two differ, the signed engagement terms apply.
				</p>
			</section>
		</div>

		<a href="/auth/pricing" class="mt-10 inline-block text-gray-900 underline">
			Back to pricing
		</a>
	</div>
</div>
