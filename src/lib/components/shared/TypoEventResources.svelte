<script lang="ts">
	interface Props {
		programmePdfUrl?: string | null;
		programmePdfLabel?: string | null;
		galleryUrl?: string | null;
		pressReleaseUrl?: string | null;
		pressReleaseLabel?: string | null;
	}

	let {
		programmePdfUrl,
		programmePdfLabel,
		galleryUrl,
		pressReleaseUrl,
		pressReleaseLabel,
	}: Props = $props();

	const hasResources = $derived(
		Boolean(programmePdfUrl || galleryUrl || pressReleaseUrl),
	);
</script>

{#if hasResources}
	<div class="mt-6 border-t border-black/10 pt-5">
		<p
			class="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-black/40"
		>
			Resources
		</p>
		<ul class="space-y-2 text-sm">
			{#if programmePdfUrl}
				<li>
					<a
						href={programmePdfUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 text-black/70 transition-colors hover:text-black"
					>
						<span aria-hidden="true">→</span>
						{programmePdfLabel}
					</a>
				</li>
			{/if}
			{#if galleryUrl}
				<li>
					<a
						href={galleryUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-2 text-black/70 transition-colors hover:text-black"
					>
						<span aria-hidden="true">→</span>
						Browse the photo gallery
					</a>
				</li>
			{/if}
			{#if pressReleaseUrl}
				<li>
					<a
						href={pressReleaseUrl}
						class="inline-flex items-center gap-2 text-black/70 transition-colors hover:text-black"
					>
						<span aria-hidden="true">→</span>
						{pressReleaseLabel}
					</a>
				</li>
			{/if}
		</ul>
	</div>
{/if}
