<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import {
		ChartColumnIcon,
		FileCheckIcon,
		FileTextIcon,
		LayoutGridIcon
	} from '@lucide/svelte';
	import type { PageProps } from './$types';
	import EmptyState from '$lib/app/components/montsel/empty-state.svelte';
	import ShareButton from '$lib/app/components/montsel/share-button.svelte';
	import { formatDate, formatLabel } from '$lib/app/components/montsel/format';
	import { getProduct } from '#lib/modules/products/shared/registry.js';

	let { data }: PageProps = $props();

	const CATEGORIES = [
		{ family: 'diagnostic', label: 'Diagnostic', icon: ChartColumnIcon },
		{ family: 'strategy', label: 'Strategy', icon: FileCheckIcon },
		{ family: 'tool', label: 'Tools', icon: LayoutGridIcon }
	] as const;

	const productName = (key: string) => getProduct(key)?.name ?? 'Montsel';
</script>

<svelte:head><title>Documents — Montsel</title></svelte:head>

<header>
	<h1 class="text-3xl font-semibold">Documents</h1>
	<p class="text-muted-foreground mt-2">
		Every output from your diagnostic, strategy and tool work in one place.
	</p>
</header>

{#if data.total === 0 && !data.filters.search && !data.filters.family}
	<EmptyState
		title="No documents yet"
		description="Outputs appear here when you complete diagnostic, strategy or tool work in this brand."
		action={data.emptyAction}
	/>
{:else}
	<nav aria-label="Document categories" class="grid gap-6 md:grid-cols-3">
		{#each CATEGORIES as category (category.family)}
			{@const active = data.filters.family === category.family}
			<Card.Root class={active ? 'border-foreground/40' : ''}>
				<Card.Content class="flex items-center gap-3">
					<div class="bg-muted flex size-10 items-center justify-center rounded-lg">
						<category.icon class="size-5" />
					</div>
					<div class="flex-1">
						<p class="text-sm font-medium">{category.label}</p>
						<p class="text-muted-foreground text-xs">
							{data.counts[category.family]}
							{data.counts[category.family] === 1 ? 'document' : 'documents'}
						</p>
					</div>
					<Button
						variant={active ? 'default' : 'outline'}
						size="sm"
						href={active ? '/app/documents' : `/app/documents?family=${category.family}`}
					>
						{active ? 'Showing' : 'Filter'}
					</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</nav>

	<form method="GET" class="flex flex-wrap items-end gap-3">
		{#if data.filters.family}
			<input type="hidden" name="family" value={data.filters.family} />
		{/if}
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium" for="document-search">Search</label>
			<Input
				id="document-search"
				name="q"
				type="search"
				value={data.filters.search}
				placeholder="Search documents"
				class="w-56"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium" for="document-sort">Sort</label>
			<select
				id="document-sort"
				name="sort"
				class="border-input bg-background h-8 rounded-lg border px-2 text-sm"
			>
				<option value="newest" selected={data.filters.sort === 'newest'}>Newest first</option>
				<option value="oldest" selected={data.filters.sort === 'oldest'}>Oldest first</option>
				<option value="title" selected={data.filters.sort === 'title'}>Title</option>
			</select>
		</div>
		<Button type="submit" variant="outline" size="sm">Apply</Button>
	</form>

	<Card.Root>
		<Card.Header>
			<Card.Title>
				{data.filters.search ? `Results for “${data.filters.search}”` : 'All documents'}
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.documents.length}
				<table class="w-full text-left text-sm">
					<thead class="text-muted-foreground">
						<tr class="border-b">
							<th class="py-2 font-medium">Name</th>
							<th class="py-2 font-medium">Product</th>
							<th class="py-2 font-medium">Created</th>
							<th class="py-2 font-medium">Format</th>
							<th class="py-2 font-medium"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.documents as document (document.id)}
							<tr class="border-b last:border-0">
								<td class="py-3">
									<a class="font-medium underline-offset-4 hover:underline" href={`/app/documents/${document.id}`}>
										{document.title}
									</a>
								</td>
								<td class="text-muted-foreground py-3">{productName(document.productKey)}</td>
								<td class="py-3">{formatDate(document.createdAt)}</td>
								<td class="py-3">
									<Badge variant="outline">{formatLabel(document.format)}</Badge>
								</td>
								<td class="py-3">
									<div class="flex justify-end gap-2">
										{#if document.canView}
											<Button
												variant="outline"
												size="sm"
												href={document.openPath ?? `/app/documents/${document.id}`}
											>
												<FileTextIcon />
												Open
											</Button>
										{/if}
										{#if document.canShare && document.shareSlug}
											<ShareButton path={`/share/${document.shareSlug}`} />
										{/if}
										{#if document.canDownload}
											<Button
												variant="outline"
												size="sm"
												href={`/app/documents/${document.id}/download`}
											>
												Download
											</Button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="text-muted-foreground text-sm">
					No documents match these filters. <a class="underline" href="/app/documents">Clear filters</a>
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
{/if}
