<script lang="ts">
	interface Props {
		subtitle?: string | null;
		partnerName?: string | null;
		partnerUrl?: string | null;
	}

	let { subtitle, partnerName, partnerUrl }: Props = $props();
</script>

{#if subtitle}
	<p class="-mt-3 text-sm uppercase tracking-[0.2em] text-black/50">
		{subtitle}
	</p>
{/if}

{#if partnerName}
	<p class="text-sm text-black/60">
		In partnership with
		{#if partnerUrl}
			<a
				href={partnerUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-black underline decoration-black/30 underline-offset-2 hover:decoration-black"
			>
				{partnerName}
			</a>
		{:else}
			<span class="font-medium text-black">{partnerName}</span>
		{/if}
		.
	</p>
{/if}
