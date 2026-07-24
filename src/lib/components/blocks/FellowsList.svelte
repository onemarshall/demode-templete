<script lang="ts">
	import { setAttr } from "$lib/services/directus/visualEditing";
	import { X } from "@lucide/svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface LookupItem {
		id: number;
		name: string;
	}

	interface FellowListItem {
		id: string | number;
		sort?: number | null;
		name?: string | null;
		position?: string | null;
		role_id?: LookupItem | null;
		discipline_id?: LookupItem | null;
		region_id?: LookupItem | null;
		focus_id?: LookupItem | null;
		bio?: string | null;
	}

	// Resolve relational field with fallback to old string field
	const resolveName = (
		relational?: LookupItem | null,
		fallback?: string | null,
	) => relational?.name ?? fallback ?? null;

	interface FellowsListBlock {
		id: string | number;
		headline?: string | null;
		search_placeholder?: string | null;
		discipline_label?: string | null;
		region_label?: string | null;
		focus_label?: string | null;
		all_label?: string | null;
		items?: FellowListItem[] | null;
	}

	interface FellowsListReferenceBlock {
		id: string | number;
		fellows_list_reference?: FellowsListBlock | null;
	}

	const FILTER_KEYS = ["discipline", "region", "focus"] as const;
	type FilterKey = (typeof FILTER_KEYS)[number];

	let { data } = $props<{
		data: FellowsListBlock | FellowsListReferenceBlock;
	}>();

	const sourceData = $derived(
		"fellows_list_reference" in data && data.fellows_list_reference
			? data.fellows_list_reference
			: data,
	);

	let selectedDiscipline = $state("All");
	let selectedRegion = $state("All");
	let selectedFocus = $state("All");
	let activeFellow = $state<FellowListItem | null>(null);
	let dialogEl: HTMLDialogElement | null = $state(null);
	let searchTerm = $state("");
	let filterOpen = $state(false);

	const allLabel = $derived(sourceData.all_label?.trim() || "All");
	const searchPlaceholder = $derived(
		sourceData.search_placeholder?.trim() || "Search by name...",
	);
	const filterLabels = $derived({
		discipline: sourceData.discipline_label?.trim() || "Discipline",
		region: sourceData.region_label?.trim() || "Region",
		focus: sourceData.focus_label?.trim() || "Focus",
	});

	const items = $derived(
		(sourceData.items ?? [])
			.slice()
			.sort(
				(a: FellowListItem, b: FellowListItem) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);

	function buildOptions(values: Array<string | null | undefined>) {
		const normalized = values
			.map((value) => value?.trim())
			.filter((value): value is string => Boolean(value));
		return [
			allLabel,
			...Array.from(new Set(normalized)).sort((a, b) =>
				a.localeCompare(b),
			),
		];
	}

	const disciplineOptions = $derived(
		buildOptions(
			items.map((i: FellowListItem) => resolveName(i.discipline_id)),
		),
	);
	const regionOptions = $derived(
		buildOptions(
			items.map((i: FellowListItem) => resolveName(i.region_id)),
		),
	);
	const focusOptions = $derived(
		buildOptions(items.map((i: FellowListItem) => resolveName(i.focus_id))),
	);

	const filteredItems = $derived.by(() => {
		const query = searchTerm.trim().toLowerCase();
		return items.filter((item: FellowListItem) => {
			const disc = resolveName(item.discipline_id);
			const reg = resolveName(item.region_id);
			const foc = resolveName(item.focus_id);
			const matchDiscipline =
				selectedDiscipline === allLabel || disc === selectedDiscipline;
			const matchRegion =
				selectedRegion === allLabel || reg === selectedRegion;
			const matchFocus =
				selectedFocus === allLabel || foc === selectedFocus;
			const matchSearch =
				!query || (item.name?.toLowerCase().includes(query) ?? false);
			return matchDiscipline && matchRegion && matchFocus && matchSearch;
		});
	});

	const hasFilters = $derived(
		selectedDiscipline !== allLabel ||
			selectedRegion !== allLabel ||
			selectedFocus !== allLabel ||
			searchTerm.trim() !== "",
	);

	function clearAll() {
		selectedDiscipline = allLabel;
		selectedRegion = allLabel;
		selectedFocus = allLabel;
		searchTerm = "";
	}

	function openFellow(fellow: FellowListItem) {
		activeFellow = fellow;
		dialogEl?.showModal();
	}

	function closeFellow() {
		dialogEl?.close();
		activeFellow = null;
	}

	const initials = (name?: string | null) => {
		const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
		return parts
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? "")
			.join("");
	};

	// Deterministic color for avatar based on name
	const avatarColors = [
		"bg-primary/10 text-primary",
		"bg-sec/10 text-sec",
		"bg-accent/10 text-accent",
		"bg-primary-700/10 text-primary-700",
		"bg-gray-200 text-gray-600",
	];
	const avatarColor = (id: string | number) => {
		const hash = String(id)
			.split("")
			.reduce((a, c) => a + c.charCodeAt(0), 0);
		return avatarColors[hash % avatarColors.length];
	};
</script>

<section
	data-directus={"fellows_list_reference" in data
		? setAttr({
				collection: "block_global_fellows_list_ref",
				item: data.id,
				fields: "fellows_list_reference",
				mode: "popover",
			})
		: setAttr({
				collection: "block_fellows_list",
				item: sourceData.id,
				fields: "headline,search_placeholder,discipline_label,region_label,focus_label,all_label,items",
				mode: "popover",
			})}
>
	<Container>
		<Headline headline={sourceData.headline} size="md" class="mb-10" />

		<!-- Mobile filter toggle -->
		<button
			class="mb-6 flex items-center gap-2 border-b border-gray-300 pb-2 text-sm font-medium uppercase tracking-[0.15em] text-gray-600 lg:hidden"
			onclick={() => (filterOpen = !filterOpen)}
		>
			<svg
				class="size-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M3 4h18M3 12h12M3 20h6" />
			</svg>
			{filterOpen ? "Hide filters" : "Filter fellows"}
		</button>

		<div class="flex flex-col gap-[clamp(2rem,4vw,4rem)] lg:flex-row">
			<!-- ═══ LEFT: Filter sidebar ═══ -->
			<aside
				class="shrink-0 lg:w-64 {filterOpen ? '' : 'hidden lg:block'}"
			>
				<div class="sticky top-28 space-y-8">
					<!-- Search -->
					<div>
						<h3
							class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
						>
							Search
						</h3>
						<input
							type="search"
							bind:value={searchTerm}
							placeholder={searchPlaceholder}
							class="w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none"
						/>
					</div>

					<!-- Discipline -->
					{#if disciplineOptions.length > 1}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								{filterLabels.discipline}
							</h3>
							<ul class="space-y-1">
								{#each disciplineOptions as option (option)}
									<li>
										<button
											type="button"
											onclick={() =>
												(selectedDiscipline = option)}
											class="block w-full py-1.5 text-left text-sm transition-colors {selectedDiscipline ===
											option
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{option}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<!-- Region -->
					{#if regionOptions.length > 1}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								{filterLabels.region}
							</h3>
							<ul class="space-y-1">
								{#each regionOptions as option (option)}
									<li>
										<button
											type="button"
											onclick={() =>
												(selectedRegion = option)}
											class="block w-full py-1.5 text-left text-sm transition-colors {selectedRegion ===
											option
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{option}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<!-- Focus -->
					{#if focusOptions.length > 1}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								{filterLabels.focus}
							</h3>
							<ul class="space-y-1">
								{#each focusOptions as option (option)}
									<li>
										<button
											type="button"
											onclick={() =>
												(selectedFocus = option)}
											class="block w-full py-1.5 text-left text-sm transition-colors {selectedFocus ===
											option
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{option}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

				</div>
			</aside>

			<!-- ═══ RIGHT: Fellows listing ═══ -->
			<div class="min-w-0 flex-1">
				<!-- Results count -->
				<div
					class="mb-8 flex items-baseline justify-between border-b border-gray-200 pb-4"
				>
					<p class="text-sm text-gray-500">
						{filteredItems.length}
						{filteredItems.length === 1 ? "fellow" : "fellows"}
						{#if hasFilters}<span class="text-gray-400"
								>&mdash; filtered</span
							>{/if}
					</p>
					{#if hasFilters}
						<button
							type="button"
							onclick={clearAll}
							class="rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-700"
						>
							Clear all
						</button>
					{/if}
				</div>

				{#if filteredItems.length === 0}
					<div class="py-20 text-center">
						<p class="font-secondary text-lg text-gray-400">
							No fellows match the current filters.
						</p>
						{#if hasFilters}
							<button
								type="button"
								onclick={clearAll}
								class="mt-4 inline-block text-sm text-primary underline"
							>
								Clear filters
							</button>
						{/if}
					</div>
				{:else}
					<div
						class="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3"
					>
						{#each filteredItems as fellow (fellow.id)}
							{@const disc = resolveName(fellow.discipline_id)}
							{@const reg = resolveName(fellow.region_id)}
							{@const foc = resolveName(fellow.focus_id)}
							<button
								type="button"
								onclick={() => openFellow(fellow)}
								class="group relative w-full rounded-sm border border-gray-200 bg-white p-5 text-left transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
								data-directus={setAttr({
									collection: "block_fellows_list_items",
									item: fellow.id,
									fields: "name,role,discipline,region,focus,bio",
									mode: "popover",
								})}
							>
								<div class="flex items-start gap-4">
									<div
										class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-transform duration-300 group-hover:scale-110 {avatarColor(
											fellow.id,
										)}"
									>
										{initials(fellow.name) || "OF"}
									</div>

									<div class="min-w-0 flex-1">
										{#if fellow.name}
											<h3
												class="font-serif text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary"
											>
												{fellow.name}
											</h3>
										{/if}

										{#if fellow.position}
											<p
												class="mt-1 text-sm leading-relaxed text-gray-500"
											>
												{fellow.position}
											</p>
										{:else if fellow.role_id?.name}
											<p
												class="mt-1 text-sm leading-relaxed text-gray-500"
											>
												{fellow.role_id.name}
											</p>
										{/if}

										<div class="mt-3 flex flex-wrap items-center gap-1.5">
											{#if disc}
												<span class="rounded-sm border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
													{disc}
												</span>
											{/if}
											{#if reg}
												<span class="rounded-sm border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
													{reg}
												</span>
											{/if}
											{#if foc}
												<span class="rounded-sm border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] text-primary">
													{foc}
												</span>
											{/if}
										</div>

										{#if fellow.bio}
											<p class="mt-3 text-[11px] font-medium uppercase tracking-wide text-primary">
												Read bio &rarr;
											</p>
										{/if}
									</div>

									<!-- Hover indicator arrow -->
									<div class="mt-1 shrink-0 translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
										<svg class="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
											<path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
										</svg>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Container>
</section>

<!-- ═══ Fellow detail dialog ═══ -->
<dialog
	bind:this={dialogEl}
	class="fixed inset-0 m-auto h-fit w-full sm:max-w-[525px] rounded-sm border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95"
	onclick={(e) => {
		if (e.target === dialogEl) closeFellow();
	}}
	onclose={() => (activeFellow = null)}
>
	{#if activeFellow}
		{@const activeDisc = resolveName(activeFellow.discipline_id)}
		{@const activeReg = resolveName(activeFellow.region_id)}
		{@const activeFoc = resolveName(activeFellow.focus_id)}
		<div class="relative p-8">
			<!-- Close button -->
			<button
				type="button"
				onclick={closeFellow}
				class="absolute right-4 top-4 rounded-sm p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
				aria-label="Close"
			>
				<X size={18} />
			</button>

			<!-- Header -->
			<div class="flex items-start gap-5 pr-8">
				<div
					class="flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold {avatarColor(
						activeFellow.id,
					)}"
				>
					{initials(activeFellow.name) || "OF"}
				</div>

				<div class="min-w-0 flex-1">
					{#if activeFellow.name}
						<h3
							class="font-serif text-2xl font-bold leading-snug text-gray-900"
						>
							{activeFellow.name}
						</h3>
					{/if}

					{#if activeFellow.position}
						<p class="mt-1 text-sm leading-relaxed text-gray-500">
							{activeFellow.position}
						</p>
					{:else if activeFellow.role_id?.name}
						<p class="mt-1 text-sm leading-relaxed text-gray-500">
							{activeFellow.role_id.name}
						</p>
					{/if}

					<div class="mt-4 flex flex-wrap gap-2">
						{#if activeDisc}
							<span class="rounded-sm border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
								{activeDisc}
							</span>
						{/if}
						{#if activeReg}
							<span class="rounded-sm border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
								{activeReg}
							</span>
						{/if}
						{#if activeFoc}
							<span class="rounded-sm border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary">
								{activeFoc}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Bio -->
			{#if activeFellow.bio}
				<div
					class="mt-6 border-t border-gray-100 pt-6 prose prose-sm max-w-none prose-p:text-gray-600 prose-p:leading-7"
				>
					{#each activeFellow.bio.split("\n\n") as para, i (i)}
							<p>{para}</p>
						{/each}
				</div>
			{/if}
		</div>
	{/if}
</dialog>
