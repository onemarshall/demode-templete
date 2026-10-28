<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { formatDate } from '$lib/app/components/montsel/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Save your Visual Contract — Montsel</title></svelte:head>

<div class="flex max-w-xl flex-col gap-6">
	<header class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold">Save this contract to your account</h1>
		<p class="text-muted-foreground text-sm">
			{data.projectName} will move into your workspace. The link stays live, and you can come back
			and change a choice later.
		</p>
		{#if data.expiresAt}
			<p class="text-muted-foreground text-sm">
				Unsaved, this link stops working on {formatDate(data.expiresAt)}.
			</p>
		{/if}
	</header>

	<form method="POST" class="flex flex-col gap-5">
		{#if data.brands.length}
			<div class="flex flex-col gap-2">
				<label for="brandId" class="text-sm font-medium">Where should it live?</label>
				<select
					id="brandId"
					name="brandId"
					class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				>
					<option value="">Just my account</option>
					{#each data.brands as brand (brand.id)}
						<option value={brand.id}>{brand.organisation} — {brand.name}</option>
					{/each}
				</select>
				<p class="text-muted-foreground text-xs">
					Choosing a brand adds the contract to that brand's documents.
				</p>
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<Button type="submit">Save to my account</Button>
			{#if data.publicId}
				<Button variant="ghost" href={`/contract/${data.publicId}`}>Not now</Button>
			{/if}
		</div>
	</form>
</div>
