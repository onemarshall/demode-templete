<script lang="ts">
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select';
	import type { SwitcherOrganisation } from '#lib/modules/tenancy/shared/types.js';

	let {
		organisations,
		activeBrandId
	}: { organisations: SwitcherOrganisation[]; activeBrandId: string } = $props();

	const pathname = $derived(page.url.pathname);

	const items = $derived(
		organisations.flatMap((organisation) =>
			organisation.brands.map((brand) => ({ value: brand.brandId, label: brand.brandName }))
		)
	);

	const activeLabel = $derived(
		items.find((item) => item.value === activeBrandId)?.label ?? 'Choose a brand'
	);

	let form = $state<HTMLFormElement | null>(null);

	function captureForm(node: HTMLFormElement) {
		form = node;
		return () => {
			form = null;
		};
	}

	function submit() {
		form?.requestSubmit();
	}
</script>

<form method="POST" action="/app/brand" class="min-w-0" {@attach captureForm}>
	<input type="hidden" name="next" value={pathname} />
	<Select.Root type="single" name="brandId" {items} value={activeBrandId} onValueChange={submit}>
		<Select.Trigger class="h-8 w-44 justify-between text-sm" aria-label="Active brand">
			<span class="truncate">{activeLabel}</span>
		</Select.Trigger>
		<Select.Content>
			{#each organisations as organisation (organisation.organisationId)}
				<Select.Group>
					<Select.GroupHeading>{organisation.organisationName}</Select.GroupHeading>
					{#each organisation.brands as brand (brand.brandId)}
						<Select.Item value={brand.brandId}>{brand.brandName}</Select.Item>
					{:else}
						<Select.Item value={`no-brand-${organisation.organisationId}`} disabled>
							No assigned brands
						</Select.Item>
					{/each}
				</Select.Group>
			{/each}
		</Select.Content>
	</Select.Root>
</form>
