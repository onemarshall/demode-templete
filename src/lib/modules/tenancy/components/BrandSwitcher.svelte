<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { SwitcherOrganisation } from '../shared/types.js';
	let { organisations }: { organisations: SwitcherOrganisation[] } = $props();
</script>
<nav aria-label="Organisations and brands" class="flex flex-wrap items-center gap-3 border-b pb-4">
	<Button href="/organisations" variant="outline">All organisations</Button>
	<details class="relative">
		<summary class="cursor-pointer rounded-md border px-3 py-2 text-sm">Switch brand</summary>
		<div class="absolute left-0 top-full min-w-64 rounded-lg border bg-background p-4 shadow-lg">
			{#each organisations as org (org.organisationId)}
				<section class="mb-4 flex flex-col gap-2">
					<a class="font-medium underline" href={`/o/${encodeURIComponent(org.organisationSlug)}/settings`}>{org.organisationName}</a>
					{#each org.brands as brand (brand.brandId)}
						<a class="text-sm underline" href={`/o/${encodeURIComponent(org.organisationSlug)}/${encodeURIComponent(brand.brandSlug)}`}>{brand.brandName}</a>
					{:else}<p class="text-sm text-muted-foreground">No assigned brands</p>{/each}
				</section>
			{:else}<p class="text-sm text-muted-foreground">Create an organisation to begin.</p>{/each}
		</div>
	</details>
	<Button href="/auth/account" variant="ghost">Account</Button>
</nav>
