<script lang="ts">
	import { Button, buttonVariants } from "$lib/components/ui/button";

	import { Search } from "@lucide/svelte";

	import { debounce } from "$lib/utils";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";

	let open = $state(false);
	let search = $state("");
	let searched = $state(false);
	let loading = $state(false);
	let results = $state<SearchResult[]>([]);

	type SearchResult = {
		id: string;
		title: string;
		description: string;
		type: string;
		link: string;
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			open = !open;
		}
	};

	$effect(() => {
		if (!open) {
			// results = [];
			searched = false;
			loading = false;
		}
	});

	const fetchResults = async (searchTerm: string) => {
		if (searchTerm.length < 3 || !open) {
			results = [];
			// searched = false;
			return;
		}

		loading = true;
		// searched = true;

		try {
			const res = await fetch(
				`/api/search?search=${encodeURIComponent(searchTerm)}`,
			);
			if (!res.ok) throw new Error("Failed to fetch results");
			const data: SearchResult[] = await res.json();
			results = data.filter((r) => r.link);
		} catch (error) {
			console.error("Error fetching search results:", error);
			results = [];
		} finally {
			loading = false;
		}
	};
	const debouncedFetchResults = debounce((value: unknown) => {
		void fetchResults(typeof value === "string" ? value : "");
	}, 300);

	$effect(() => {
		debouncedFetchResults(search);
	});

	const handleSelect = (result: SearchResult) => {
		void goto(resolve(result.link as `/${string}`));
		open = false;
	};
</script>

<svelte:document onkeydown={handleKeydown} />

<div class="max-w-full sm:max-w-[540px]">
	<Button
		variant="ghost"
		size="icon"
		aria-label="Search"
		onclick={() => (open = true)}
	>
		<Search class="size-5" />
	</Button>

	<div class="command-dialog" class:open>
		<input
			placeholder="Type a command or search..."
			bind:value={search}
			class="m-2 p-4 text-base leading-normal focus:outline-none border rounded"
		/>
		<div class="command-list">
			{#if !loading && !searched}
				<div class="py-2 text-center text-sm">No results found.</div>
			{/if}

			{#if loading}
				<div class="py-2 text-center text-sm">Loading...</div>
			{/if}

			{#if !loading && searched && results.length === 0}
				<div class="py-2 text-center text-sm">No results found.</div>
			{/if}

			{#if results.length > 0}
				<div class="command-group">
					<h3 class="command-group-heading">Search Results</h3>
					{#each results as result}
						<button
							type="button"
							class="command-item flex w-full items-start gap-4 px-2 py-3 text-left cursor-pointer hover:bg-gray-100"
							onclick={() => handleSelect(result)}
						>
							<Badge variant="default">{result.type}</Badge>
							<div class="ml-2 w-full">
								<p class="text-base font-medium">
									{result.title}
								</p>
								<p class="mt-1 line-clamp-2 text-sm">
									{result.description}
								</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.command-dialog {
		position: fixed;
		top: 20%;
		left: 50%;
		transform: translateX(-50%);
		width: 90%;
		max-width: 600px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		z-index: 1000;
		display: none;
	}

	.command-dialog.open {
		display: block;
	}

	.command-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.command-group-heading {
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 600;
		color: #6b7280;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}
</style>
