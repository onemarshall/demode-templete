<script lang="ts">
	import { Dialog } from "bits-ui";
	import { page } from "$app/state";
	import { setAttr } from "$lib/services/directus/visualEditing";
	import { BookCard } from "$lib/components/books";
	import { Sheet, SheetContent } from "$lib/components/ui/sheet";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import { getImageUuid } from "$lib/utils/get-image-uuid";

	interface BookItem {
		id: string | number;
		sort?: number | null;
		title?: string | null;
		author?: string | null;
		published_date?: string | null;
		category?: string | null;
		subcategory?: string | null;
		cover_color?: string | null;
		blurb?: string | null;
		buy_link?: string | null;
		image?: { id?: string | null } | string | null;
		is_featured?: boolean | null;
		is_new_release?: boolean | null;
	}

	interface BooksBlock {
		id: string | number;
		title?: string | null;
		subtitle?: string | null;
		featured_heading?: string | null;
		featured_badge_label?: string | null;
		new_releases_heading?: string | null;
		all_books_heading?: string | null;
		all_filter_label?: string | null;
		view_details_label?: string | null;
		buy_button_label?: string | null;
		filter_by_author?: string | null;
		books?: BookItem[] | null;
	}

	interface BooksReferenceBlock {
		id: string | number;
		books_reference?: BooksBlock | null;
	}

	let { data } = $props<{
		data: BooksBlock | BooksReferenceBlock;
	}>();

	const sourceData = $derived(
		"books_reference" in data && data.books_reference
			? data.books_reference
			: data,
	);

	const rootCollection = $derived(
		"books_reference" in data ? "block_global_books_ref" : "block_books",
	);
	const rootFields = $derived(
		"books_reference" in data
			? "books_reference"
			: "title,subtitle,featured_heading,featured_badge_label,new_releases_heading,all_books_heading,all_filter_label,view_details_label,buy_button_label,books",
	);

	// Author filter: CMS field takes priority, URL param ?author= as override
	const lockedAuthor = $derived(
		sourceData.filter_by_author?.trim() ||
			page.url.searchParams.get("author") ||
			null,
	);

	let activeAuthor = $state("All");
	let activeFilter = $state("All");
	let activeSubFilter = $state("All");
	let searchTerm = $state("");

	// When a locked author is set, sync the active author filter
	$effect(() => {
		if (lockedAuthor) {
			activeAuthor = lockedAuthor;
		}
	});
	let sheetOpen = $state(false);
	let selectedBook = $state<BookItem | null>(null);
	let filterOpen = $state(false);

	function toDateValue(value?: string | null) {
		if (!value) return Number.NEGATIVE_INFINITY;
		const time = new Date(value).getTime();
		return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
	}

	const allBooks = $derived(
		(sourceData.books ?? []).slice().sort((a: BookItem, b: BookItem) => {
			const sortDiff = (a.sort ?? 0) - (b.sort ?? 0);
			if (sortDiff !== 0) return sortDiff;
			return (
				toDateValue(b.published_date) - toDateValue(a.published_date)
			);
		}),
	);

	const allFilterLabel = $derived(
		sourceData.all_filter_label?.trim() || "All",
	);
	const featuredHeading = $derived(
		sourceData.featured_heading?.trim() || "Featured Publication",
	);
	const featuredBadgeLabel = $derived(
		sourceData.featured_badge_label?.trim() || "New Release",
	);
	const viewDetailsLabel = $derived(
		sourceData.view_details_label?.trim() || "View details",
	);
	const buyButtonLabel = $derived(
		sourceData.buy_button_label?.trim() || "Buy Book",
	);

	const featuredBook = $derived.by(() => {
		const manual = allBooks.find((book: BookItem) => book.is_featured);
		if (manual) return manual;
		return allBooks.reduce((latest: BookItem | null, current: BookItem) => {
			if (!latest) return current;
			return toDateValue(current.published_date) >
				toDateValue(latest.published_date)
				? current
				: latest;
		}, null);
	});

	const categories = $derived.by(() => {
		const values = allBooks
			.map((book: BookItem) => book.category?.trim())
			.filter((value: string | undefined): value is string =>
				Boolean(value),
			);
		const unique = Array.from(new Set(values)) as string[];
		return [allFilterLabel, ...unique.sort((a, b) => a.localeCompare(b))];
	});

	const authors = $derived.by(() => {
		const values = allBooks
			.map((book: BookItem) => book.author?.trim())
			.filter((value: string | undefined): value is string =>
				Boolean(value),
			);
		const unique = Array.from(new Set(values)) as string[];
		return [allFilterLabel, ...unique.sort((a, b) => a.localeCompare(b))];
	});

	const subcategories = $derived.by(() => {
		if (activeFilter === allFilterLabel) return [];
		const values = allBooks
			.filter((book: BookItem) => book.category === activeFilter)
			.map((book: BookItem) => book.subcategory?.trim())
			.filter((value: string | undefined): value is string =>
				Boolean(value),
			);
		const unique = Array.from(new Set(values)) as string[];
		return unique.sort((a, b) => a.localeCompare(b));
	});

	const filteredBooks = $derived.by(() => {
		const query = searchTerm.trim().toLowerCase();
		return allBooks.filter((book: BookItem) => {
			if (
				activeAuthor !== allFilterLabel &&
				book.author?.trim() !== activeAuthor
			)
				return false;
			if (
				activeFilter !== allFilterLabel &&
				book.category !== activeFilter
			)
				return false;
			if (
				activeSubFilter !== allFilterLabel &&
				book.subcategory !== activeSubFilter
			)
				return false;
			if (
				query &&
				!(
					book.title?.toLowerCase().includes(query) ||
					book.author?.toLowerCase().includes(query)
				)
			)
				return false;
			return true;
		});
	});

	const hasFilters = $derived(
		activeFilter !== allFilterLabel ||
			activeSubFilter !== allFilterLabel ||
			activeAuthor !== allFilterLabel ||
			searchTerm.trim() !== "",
	);

	function selectCategory(cat: string) {
		activeFilter = cat;
		activeSubFilter = allFilterLabel;
	}

	function clearAll() {
		activeFilter = allFilterLabel;
		activeSubFilter = allFilterLabel;
		if (!lockedAuthor) activeAuthor = allFilterLabel;
		searchTerm = "";
	}

	function openBook(book: BookItem) {
		selectedBook = book;
		sheetOpen = true;
	}

	function openExternalLink(url: string) {
		window.open(url, "_blank", "noopener,noreferrer");
	}

	function getBookYear(book?: BookItem | null) {
		if (!book?.published_date) return "";
		return new Date(book.published_date).getFullYear().toString();
	}
</script>

<section
	// class="pb-[clamp(2rem,6vw,5rem)] px-10"
	data-directus={setAttr({
		collection: rootCollection,
		item: data.id,
		fields: rootFields,
		mode: "popover",
	})}
>
	<Container>
		{#if sourceData.title || sourceData.subtitle}
			<div class="mb-10">
				<Headline headline={sourceData.title} size="md" />
				{#if sourceData.subtitle}
					<p
						class="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500"
					>
						{sourceData.subtitle}
					</p>
				{/if}
			</div>
		{/if}

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
			{filterOpen ? "Hide filters" : "Filter books"}
		</button>

		<div
			class="flex flex-col gap-[clamp(2rem,4vw,4rem)] lg:flex-row lg:items-start"
		>
			<!-- ═══ LEFT: Filter sidebar ═══ -->
			<aside
				class=" self-start lg:w-64 {filterOpen
					? ''
					: 'hidden lg:block'}"
			>
				<div class=" top-28 max-h-[calc(100vh-8rem)] space-y-8">
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
							placeholder="Search by title or author..."
							class="w-full rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none"
						/>
					</div>

					<!-- Categories -->
					{#if categories.length > 1}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								Category
							</h3>
							<ul class="space-y-1">
								{#each categories as cat (cat)}
									<li>
										<button
											type="button"
											onclick={() => selectCategory(cat)}
											class="block w-full py-1.5 text-left text-sm transition-colors {activeFilter ===
											cat
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{cat}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<!-- Authors (hidden when locked to a specific author) -->
					{#if !lockedAuthor && authors.length > 2}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								Author
							</h3>
							<ul class="space-y-1">
								{#each authors as auth (auth)}
									<li>
										<button
											type="button"
											onclick={() =>
												(activeAuthor = auth)}
											class="block w-full py-1.5 text-left text-sm transition-colors {activeAuthor ===
											auth
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{auth}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<!-- Subcategories -->
					{#if subcategories.length > 0}
						<nav>
							<h3
								class="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-500"
							>
								Subcategory
							</h3>
							<ul class="space-y-1">
								<li>
									<button
										type="button"
										onclick={() =>
											(activeSubFilter = allFilterLabel)}
										class="block w-full py-1.5 text-left text-sm transition-colors {activeSubFilter ===
										allFilterLabel
											? 'font-semibold text-primary'
											: 'text-gray-600 hover:text-gray-900'}"
									>
										{allFilterLabel}
									</button>
								</li>
								{#each subcategories as sub (sub)}
									<li>
										<button
											type="button"
											onclick={() =>
												(activeSubFilter = sub)}
											class="block w-full py-1.5 text-left text-sm transition-colors {activeSubFilter ===
											sub
												? 'font-semibold text-primary'
												: 'text-gray-600 hover:text-gray-900'}"
										>
											{sub}
										</button>
									</li>
								{/each}
							</ul>
						</nav>
					{/if}

					<!-- Clear all -->
					{#if hasFilters}
						<button
							type="button"
							onclick={clearAll}
							class="inline-block border-b border-gray-400 pb-0.5 text-xs uppercase tracking-0.1em text-gray-500 transition-colors hover:border-gray-800 hover:text-gray-800"
						>
							Clear all filters
						</button>
					{/if}
				</div>
			</aside>

			<!-- ═══ RIGHT: Books listing ═══ -->
			<div class="min-w-0 flex-1 mb-10">
				<!-- Results count -->
				<div
					class="mb-8 flex items-baseline justify-between border-b border-gray-200 pb-4"
				>
					<p class="text-sm text-gray-500">
						{filteredBooks.length}
						{filteredBooks.length === 1 ? "book" : "books"}
						{#if hasFilters}<span class="text-gray-400"
								>&mdash; filtered</span
							>{/if}
					</p>
				</div>

				<!-- Featured book hero -->
				{#if featuredBook && !hasFilters}
					<button
						type="button"
						class="group mb-10 flex w-full cursor-pointer flex-col overflow-hidden rounded-sm border border-gray-200 bg-white text-left transition-colors duration-300 hover:border-primary/40 sm:flex-row"
						onclick={() => openBook(featuredBook)}
					>
						<div
							class="relative min-h-[640px] w-full shrink-0 overflow-hidden sm:w-110"
						>
							{#if getImageUuid(featuredBook.image)}
								<DirectusImage
									uuid={getImageUuid(featuredBook.image)}
									alt={featuredBook.title ?? ""}
									class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
									fill
								/>
							{:else}
								<div
									class="size-full"
									style="background-color: {featuredBook.cover_color ||
										'#4a5568'};"
								></div>
							{/if}
							<span
								class="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-0.1em text-white backdrop-blur-sm"
							>
								{featuredBadgeLabel}
							</span>
						</div>
						<div class="flex flex-1 flex-col p-6 sm:p-8">
							<p
								class="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400"
							>
								{featuredHeading}
							</p>
							<h3
								class="font-serif text-2xl sm:text-6xl font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary"
							>
								{featuredBook.title}
							</h3>
							<p class="mt-2 text-sm text-gray-500">
								{featuredBook.author}{#if getBookYear(featuredBook)}
									· {getBookYear(featuredBook)}{/if}
							</p>
							{#if featuredBook.blurb}
								<p
									class="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-500"
								>
									{featuredBook.blurb}
								</p>
							{/if}
							<div class="mt-4 flex flex-wrap gap-2">
								{#if featuredBook.category}
									<span
										class="rounded-sm border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500"
										>{featuredBook.category}</span
									>
								{/if}
								{#if featuredBook.subcategory}
									<span
										class="rounded-sm border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] text-primary"
										>{featuredBook.subcategory}</span
									>
								{/if}
							</div>
							<span class="mt-5 text-xs font-medium text-primary">
								{viewDetailsLabel} &rarr;
							</span>
						</div>
					</button>
				{/if}

				<!-- Book grid -->
				{#if filteredBooks.length === 0}
					<div class="py-20 text-center">
						<p class="font-secondary text-lg text-gray-400">
							No books match the current filters.
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
						class="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4"
					>
						{#each filteredBooks as book (book.id)}
							<BookCard
								title={book.title ?? ""}
								author={book.author ?? ""}
								year={getBookYear(book)}
								blurb={book.blurb ?? ""}
								color={book.cover_color ?? "#94a3b8"}
								image={getImageUuid(book.image)}
								selected={selectedBook?.id === book.id &&
									sheetOpen}
								onclick={() => openBook(book)}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Container>
</section>

<Sheet bind:open={sheetOpen}>
	<SheetContent
		side="right"
		class="bg-gray-50 border-0 w-[400px] sm:w-[540px] sm:max-w-[540px]! overflow-y-auto"
	>
		{#if selectedBook}
			<div
				class="relative h-[300px] w-full shrink-0 overflow-hidden bg-gray-100"
			>
				{#if getImageUuid(selectedBook.image)}
					<DirectusImage
						uuid={getImageUuid(selectedBook.image)}
						alt={selectedBook.title ?? ""}
						class="h-full w-full object-cover"
						fill
					/>
				{:else}
					<div
						class="h-full w-full"
						style={`background-color: ${selectedBook.cover_color || "#64748b"};`}
					></div>
				{/if}
			</div>
			<div class="p-8 pb-12">
				<Dialog.Title
					class="mb-2 font-serif text-2xl md:text-3xl leading-tight text-gray-900"
				>
					{selectedBook.title}
				</Dialog.Title>
				<Dialog.Description class="sr-only"
					>Details about {selectedBook.title}</Dialog.Description
				>

				<p class="mb-5 text-sm text-gray-500">{selectedBook.author}</p>

				<div class="flex flex-wrap items-center gap-2">
					{#if selectedBook.category}
						<span
							class="rounded-sm border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
						>
							{selectedBook.category}
						</span>
					{/if}
					{#if selectedBook.subcategory}
						<span
							class="rounded-sm border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary"
						>
							{selectedBook.subcategory}
						</span>
					{/if}
					{#if getBookYear(selectedBook)}
						<span class="text-xs text-gray-400"
							>{getBookYear(selectedBook)}</span
						>
					{/if}
				</div>

				<div class="my-6 h-px bg-gray-200"></div>

				<div class="prose text-sm leading-7 text-gray-600">
					{@html selectedBook.blurb}
				</div>

				{#if selectedBook.buy_link}
					<button
						type="button"
						class="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
						onclick={() =>
							selectedBook?.buy_link &&
							openExternalLink(selectedBook.buy_link)}
					>
						{buyButtonLabel}
					</button>
				{/if}
			</div>
		{/if}
	</SheetContent>
</Sheet>
