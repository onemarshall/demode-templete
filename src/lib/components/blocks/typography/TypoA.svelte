<script lang="ts">
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { fade } from "scripts/actions";
	import Container from "$lib/components/ui/Container.svelte";
	import {
		CentreBooks,
		JournalOfAnimalEthics,
		ResearchFellows,
		Fellows,
		Video,
		Impact,
		OurResearch,
		Directors,
		About,
		Aims,
		OurNews,
		History,
		AnimalEthics,
		LatestNews,
		Commentary,
		ResearchAreas,
		HonoraryFellows,
		ApplyToBeAFellow,
		PreviousMeetings,
		TheAnimalThing,
	} from "$lib/icons";
	import type { Component } from "svelte";

	const iconMap: Record<string, Component> = {
		centre_books: CentreBooks,
		journal_of_animal_ethics: JournalOfAnimalEthics,
		research_fellows: ResearchFellows,
		fellows: Fellows,
		video: Video,
		impact: Impact,
		our_research: OurResearch,
		directors: Directors,
		about: About,
		aims: Aims,
		our_news: OurNews,
		history: History,
		animal_ethics: AnimalEthics,
		latest_news: LatestNews,
		commentary: Commentary,
		research_areas: ResearchAreas,
		honorary_fellows: HonoraryFellows,
		apply_to_be_a_fellow: ApplyToBeAFellow,
		previous_meetings: PreviousMeetings,
		the_animal_thing: TheAnimalThing,
	};

	interface TypographyStyleAItem {
		id: string | number;
		statement?: string | null;
		sort?: number | null;
	}

	interface TypographyStyleABlock {
		id: string | number;
		title?: string | null;
		headline?: string | null;
		icon_key?: string | null;
		statements?: TypographyStyleAItem[] | null;
	}

	let { data } = $props<{
		data: TypographyStyleABlock;
	}>();

	const title = $derived(data.title?.trim() || "Global Impact");
	const headline = $derived(
		data.headline?.trim() || "We have a global impact",
	);
	const Icon = $derived(
		data.icon_key ? (iconMap[data.icon_key] ?? null) : null,
	);
	const statements = $derived<TypographyStyleAItem[]>(
		(data.statements ?? [])
			.slice()
			.sort(
				(a: TypographyStyleAItem, b: TypographyStyleAItem) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			)
			.filter(
				(item: TypographyStyleAItem): item is TypographyStyleAItem =>
					Boolean(item.statement?.trim()),
			),
	);
</script>

<section
	class="bg-gray-100 py-8 lg:py-12 min-h-dvh"
	data-directus={setAttr({
		collection: "block_typography_style_a",
		item: data.id,
		fields: "title,headline,icon_key,statements",
		mode: "popover",
	})}
>
	<Container>
		<div
			class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-8"
		>
			<div
				class="relative min-h-72 overflow-hidden rounded-0.75rem border border-black/8 bg-transparent pt-10 lg:min-h-[70vh]"
			>
				{#if Icon}
					<span
						class="pointer-events-none absolute -left-8 -top-8 size-56 text-black opacity-[0.04] *:first:block *:first:size-full lg:size-100"
					>
						<Icon />
					</span>
				{/if}

				<h2
					use:fade={{ x: -50, duration: 1.3 }}
					class="relative border-l-4 border-black pb-2 pl-6 max-w-[12ch] text-[clamp(2.75rem,7vw,5.5rem)] font-serif font-semibold leading-[0.92] tracking-tight text-black"
				>
					{title}
				</h2>
			</div>

			<div class="px-1 pt-1 lg:px-0 lg:pt-10">
				<h3
					use:fade={{ y: 50, duration: 1.7 }}
					class="text-[clamp(1.6rem,2.4vw,2.5rem)] font-semibold leading-tight tracking-tight text-black"
				>
					{headline}
				</h3>

				{#if statements.length}
					<div
						use:fade={{ y: 50, duration: 1.5 }}
						class="mt-5 space-y-1 text-base leading-8 text-black/75 lg:mt-6 lg:text-[1.08rem]"
					>
						{#each statements as item (item.id)}
							<p>{item.statement}</p>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Container>
</section>
