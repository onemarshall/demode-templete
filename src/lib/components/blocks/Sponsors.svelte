<script lang="ts">
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { fade, staggerFade } from "scripts/actions/fade";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";
	import { getImageUuid } from "$lib/utils/get-image-uuid";

	interface SponsorItem {
		id: string | number;
		sort?: number | null;
		name?: string | null;
		description?: string | null;
		logo?: { id?: string | null } | string | null;
		url?: string | null;
		type?: "organisation" | "individual" | null;
	}

	interface SponsorsBlock {
		id: string | number;
		headline?: string | null;
		description?: string | null;
		items?: SponsorItem[] | null;
	}

	let { data } = $props<{ data: SponsorsBlock }>();

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: SponsorItem, b: SponsorItem) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);

	const orgSponsors = $derived(
		items.filter((s: SponsorItem) => s.type !== "individual"),
	);
	const individualSponsors = $derived(
		items.filter((s: SponsorItem) => s.type === "individual"),
	);
</script>

<section
	class="py-[clamp(3rem,6vw,5rem)]"
	data-directus={setAttr({
		collection: "block_sponsors",
		item: data.id,
		fields: "headline,description,items",
		mode: "popover",
	})}
>
	<Container>
		{#if data.headline || data.description}
			<div class="mb-12" use:fade={{ y: 20 }}>
				<Headline headline={data.headline} size="md" />
				{#if data.description}
					<p
						class="mt-4 max-w-3xl text-sm leading-relaxed text-gray-500"
					>
						{data.description}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Organisation sponsors grid -->
		{#if orgSponsors.length > 0}
			<div
				class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
				use:staggerFade={{ stagger: 0.12, y: 40 }}
			>
				{#each orgSponsors as sponsor, i (sponsor.id)}
					<div
						class="group rounded-sm border border-gray-200 bg-white p-6 transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
						data-directus={setAttr({
							collection: "block_sponsors_items",
							item: sponsor.id,
							fields: "name,description,logo,url,type",
							mode: "popover",
						})}
					>
						<!-- Logo -->
						{#if getImageUuid(sponsor.logo)}
							<div class="mb-5 flex h-14 items-center">
								<img
									src={getDirectusAssetURL(
										getImageUuid(sponsor.logo),
										{ width: 300, quality: 80 },
									)}
									alt={sponsor.name ?? "Sponsor logo"}
									class="max-h-14 max-w-full w-auto object-contain grayscale transition-all duration-300 group-hover:grayscale-0"
									loading="lazy"
								/>
							</div>
						{/if}

						<!-- Name -->
						{#if sponsor.name}
							<h3
								class="font-serif text-lg font-semibold text-gray-900"
							>
								{sponsor.name}
							</h3>
						{/if}

						<!-- Description -->
						{#if sponsor.description}
							<p
								class="mt-2 line-clamp-4 text-sm leading-relaxed text-gray-500"
							>
								{sponsor.description}
							</p>
						{/if}

						<!-- Link -->
						{#if sponsor.url}
							<a
								href={sponsor.url}
								target="_blank"
								rel="noopener noreferrer"
								class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100"
							>
								Visit website
								<svg
									class="size-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path d="M7 17L17 7M17 7H7M17 7v10" />
								</svg>
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Individual sponsors -->
		{#if individualSponsors.length > 0}
			<div class="mt-14">
				<h3
					class="mb-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-400"
					use:fade={{ y: 20 }}
				>
					Individual Sponsors
				</h3>
				<div
					class="space-y-4"
					use:staggerFade={{ stagger: 0.12, y: 40 }}
				>
					{#each individualSponsors as sponsor, i (sponsor.id)}
						<div
							class="group flex gap-6 rounded-sm border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-primary/40"
							data-directus={setAttr({
								collection: "block_sponsors_items",
								item: sponsor.id,
								fields: "name,description,logo,url,type",
								mode: "popover",
							})}
						>
							<!-- Photo -->
							{#if getImageUuid(sponsor.logo)}
								<div
									class="size-20 shrink-0 overflow-hidden rounded-full"
								>
									<DirectusImage
										uuid={getImageUuid(sponsor.logo)}
										alt={sponsor.name ?? "Sponsor photo"}
										class="size-full object-cover"
										layout="fixed"
										width={80}
										height={80}
									/>
								</div>
							{/if}

							<!-- Content -->
							<div class="min-w-0 flex-1">
								{#if sponsor.name}
									<h3
										class="font-serif text-lg font-semibold text-gray-900"
									>
										{sponsor.name}
									</h3>
								{/if}
								{#if sponsor.description}
									<p
										class="mt-2 text-sm leading-relaxed text-gray-500"
									>
										{sponsor.description}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</Container>
</section>
