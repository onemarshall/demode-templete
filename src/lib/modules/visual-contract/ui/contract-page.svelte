<script lang="ts">
	/**
	 * The generated contract page: one page, two core sections.
	 *
	 * Visual Contract Brief (the direction) and Evaluation Companion (the review
	 * guide). Shared by the public /contract/[publicId] route and the authenticated
	 * preview, so the two can never drift.
	 */
	import { formatDate } from '$lib/app/components/montsel/format';
	import type { ContractContent } from '../shared/generate.js';
	import type { ProjectContext } from '../shared/types.js';

	let {
		content,
		context,
		confirmedAt,
		publicId
	}: {
		content: ContractContent;
		context: ProjectContext;
		confirmedAt: string;
		publicId: string;
	} = $props();

	const title = $derived(context.projectName?.trim() || 'Visual Contract');
</script>

<article class="flex flex-col gap-10">
	<header class="flex flex-col gap-2">
		<p class="text-muted-foreground text-sm">Visual Contract</p>
		<h1 class="text-3xl font-semibold">{title}</h1>
		<p class="text-muted-foreground text-sm">
			{#if context.clientName}{context.clientName} · {/if}{formatDate(confirmedAt)}
		</p>
		{#if context.description}
			<p class="max-w-2xl text-sm">{context.description}</p>
		{/if}
	</header>

	<section aria-labelledby="choices-heading" class="flex flex-col gap-3">
		<h2 id="choices-heading" class="text-sm font-semibold">Your six choices</h2>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each content.brief.commitments as commitment (commitment.axis)}
				<li class="rounded-lg border px-4 py-3">
					<p class="font-medium">{commitment.word}</p>
					<p class="text-muted-foreground text-xs">over {commitment.otherWord}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="brief-heading" class="flex flex-col gap-4">
		<h2 id="brief-heading" class="text-xl font-semibold">Visual Contract Brief</h2>
		<p class="max-w-2xl text-sm">{content.brief.statement}</p>

		<ol class="flex flex-col gap-3">
			{#each content.brief.commitments as commitment, index (commitment.axis)}
				<li class="rounded-xl border p-5">
					<p class="font-medium">
						<span class="text-muted-foreground mr-2 text-xs">{index + 1}</span>
						{commitment.statement}
					</p>
					<p class="text-muted-foreground mt-1 text-sm">{commitment.meaning}</p>
				</li>
			{/each}
		</ol>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">All six together</h3>
			<p class="mt-2 text-sm">{content.brief.combinedDirection}</p>
		</div>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">In my own words</h3>
			<p class="mt-2 text-sm">{content.brief.plainLanguage}</p>
		</div>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">How to use this in review</h3>
			<p class="mt-2 text-sm">{content.brief.reviewStandard}</p>
		</div>
	</section>

	<section aria-labelledby="companion-heading" class="flex flex-col gap-4">
		<div>
			<h2 id="companion-heading" class="text-xl font-semibold">Evaluation Companion</h2>
			<p class="text-muted-foreground text-sm">Your design review guide.</p>
		</div>
		<p class="max-w-2xl text-sm">{content.companion.rationale}</p>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-xl border p-5">
				<h3 class="text-sm font-semibold">Before the meeting</h3>
				<ul class="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm">
					{#each content.companion.beforeMeeting as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
			<div class="rounded-xl border p-5">
				<h3 class="text-sm font-semibold">What to look at, in order</h3>
				<ol class="mt-2 flex list-decimal flex-col gap-2 pl-4 text-sm">
					{#each content.companion.reviewSequence as step (step.title)}
						<li>
							<span class="font-medium">{step.title}.</span>
							{step.guidance}
						</li>
					{/each}
				</ol>
			</div>
		</div>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">Ask to see</h3>
			<ul class="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm">
				{#each content.companion.applicationViews as view (view)}
					<li>{view}</li>
				{/each}
			</ul>
		</div>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">How to review</h3>
			<ul class="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm">
				{#each content.companion.reviewMethod as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</div>

		<div class="flex flex-col gap-3">
			<h3 class="text-sm font-semibold">Commitment by commitment</h3>
			{#each content.companion.commitments as prompt (prompt.axis)}
				<div class="rounded-xl border p-5">
					<p class="font-medium">{prompt.word} over {prompt.otherWord}</p>
					<p class="text-muted-foreground mt-1 text-sm">{prompt.question}</p>
					<dl class="mt-3 grid gap-2 text-sm sm:grid-cols-3">
						<div>
							<dt class="text-muted-foreground text-xs uppercase">Working</dt>
							<dd class="mt-1">&ldquo;{prompt.meeting[0]}&rdquo;</dd>
						</div>
						<div>
							<dt class="text-muted-foreground text-xs uppercase">Not yet</dt>
							<dd class="mt-1">&ldquo;{prompt.notEnough[0]}&rdquo;</dd>
						</div>
						<div>
							<dt class="text-muted-foreground text-xs uppercase">Too far</dt>
							<dd class="mt-1">&ldquo;{prompt.tooFar[0]}&rdquo;</dd>
						</div>
					</dl>
				</div>
			{/each}
		</div>

		<div class="rounded-xl border p-5">
			<h3 class="text-sm font-semibold">Running the meeting</h3>
			<ul class="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm">
				{#each content.companion.meetingUse as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</section>

	<footer class="text-muted-foreground flex flex-col gap-1 border-t pt-6 text-xs">
		<p>
			This page records the direction chosen for this project. It is not a legal contract, and it
			does not mean a designer has accepted or signed it.
		</p>
		<p>Reference {publicId}</p>
	</footer>
</article>
