<script lang="ts">
	/**
	 * The review-and-use check: one scannable view of all six commitments.
	 *
	 * Each card shows the chosen word and meaning, the evaluation question, and one
	 * example of feedback when the commitment is met and one when it is not. The
	 * language is the canonical pair copy, not a paraphrase.
	 */
	import type { ReviewPrompt } from '../shared/generate.js';

	let { prompts }: { prompts: readonly ReviewPrompt[] } = $props();
</script>

<div class="flex flex-col gap-4">
	{#each prompts as prompt (prompt.axis)}
		<section class="rounded-xl border p-5">
			<header class="flex flex-wrap items-baseline gap-2">
				<h2 class="text-lg font-semibold">{prompt.word}</h2>
				<span class="text-muted-foreground text-sm">over {prompt.otherWord}</span>
			</header>
			<p class="text-muted-foreground mt-1 text-sm">{prompt.meaning}</p>

			<dl class="mt-4 flex flex-col gap-3 text-sm">
				<div>
					<dt class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Ask yourself
					</dt>
					<dd class="mt-1">{prompt.question}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						When it is working
					</dt>
					<dd class="mt-1">&ldquo;{prompt.meeting[0]}&rdquo;</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						When it is not there yet
					</dt>
					<dd class="mt-1">&ldquo;{prompt.notEnough[0]}&rdquo;</dd>
				</div>
			</dl>
		</section>
	{/each}
</div>
