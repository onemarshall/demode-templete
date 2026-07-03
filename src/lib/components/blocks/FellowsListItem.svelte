<script lang="ts">
	import { ChevronDown } from "@lucide/svelte";
	import { setAttr } from "$lib/features/directus/visualEditing";

	interface FellowItem {
		id: string | number;
		name?: string | null;
		position?: string | null;
		role?: string | null;
		discipline?: string | null;
		region?: string | null;
		focus?: string | null;
		bio?: string | null;
	}

	interface Props {
		data: FellowItem;
		expanded: boolean;
		onToggle: () => void;
	}

	let { data, expanded, onToggle }: Props = $props();

	const initials = $derived.by(() => {
		const parts = data.name?.trim().split(/\s+/).filter(Boolean) ?? [];
		return parts
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? "")
			.join("");
	});
</script>

<button
	type="button"
	onclick={onToggle}
	class="flex h-full w-full flex-col rounded-md border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:p-5"
	aria-expanded={expanded}
	data-directus={setAttr({
		collection: "block_fellows_list_items",
		item: data.id,
		fields: "name,role,discipline,region,focus,bio",
		mode: "popover",
	})}
>
	<div class="flex flex-1 flex-col">
	<div class="flex items-start justify-between gap-4">
		<div class="flex min-w-0 flex-1 items-start gap-4">
			<div
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700"
			>
				{initials || "OF"}
			</div>

			<div class="min-w-0 flex-1">
				{#if data.name}
					<h3
						class="font-serif text-lg font-semibold tracking-tight text-blue-900"
					>
						{data.name}
					</h3>
				{/if}

				{#if data.position}
					<p class="mt-1 text-sm leading-6 text-slate-600">
						{data.position}
					</p>
				{:else if data.role}
					<p class="mt-1 text-sm leading-6 text-slate-600">
						{data.role}
					</p>
				{/if}

				<div class="mt-5 flex flex-wrap gap-2">
					{#if data.discipline}
						<span
							class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
						>
							{data.discipline}
						</span>
					{/if}
					{#if data.region}
						<span
							class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
						>
							{data.region}
						</span>
					{/if}
					{#if data.focus}
						<span
							class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
						>
							{data.focus}
						</span>
					{/if}
				</div>

				{#if data.bio && !expanded}
					<p class="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
						Read bio ↓
					</p>
				{/if}

				{#if expanded && data.bio}
					<div
						class="mt-4 border-t border-slate-200 pt-4 prose prose-slate"
					>
						<div class="text-sm leading-7 text-slate-700">
							{#each data.bio.split("\n\n") as para, i (i)}
							<p>{para}</p>
						{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div
			class:rotate-180={expanded}
			class="mt-1 shrink-0 text-slate-400 transition-transform"
		>
			<ChevronDown size={20} />
		</div>
	</div>
	</div>
</button>
