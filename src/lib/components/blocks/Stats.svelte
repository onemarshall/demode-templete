<script lang="ts">
	import { numberCounter } from "scripts/actions/numberCounter";
	import { fade } from "scripts/actions/fade";
	import {
		CentreBooks,
		JournalOfAnimalEthics,
		ResearchFellows,
		Fellows,
		Video,
		Impact,
		OurResearch,
	} from "$lib/components/icons";

	import type { Component } from "svelte";
	import Container from '$lib/components/ui/Container.svelte'
	import Headline from '$lib/components/ui/Headline.svelte'

	interface StatItem {
		id: string | number;
		value: number;
		suffix?: string | null;
		label: string;
		description?: string | null;
		icon_key?: string | null;
		wide?: boolean | null;
		sort?: number | null;
	}

	interface StatsBlock {
		id: string | number;
		header?: string | null;
		subheader?: string | null;
		items?: StatItem[] | null;
	}

	let { data } = $props<{ data: StatsBlock }>();

	const iconMap: Record<string, Component> = {
		centre_books: CentreBooks,
		journal_of_animal_ethics: JournalOfAnimalEthics,
		research_fellows: ResearchFellows,
		fellows: Fellows,
		video: Video,
		impact: Impact,
		our_research: OurResearch,
	};

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort((a: StatItem, b: StatItem) => (a.sort ?? 0) - (b.sort ?? 0)),
	);
</script>

<section
	class="bg-gray-50 px-[clamp(1rem,3vw,2.5rem)] py-[clamp(3rem,8vw,5rem)]"
>
	<Container>
	{#if data.header || data.subheader}
		<header
			class="mx-auto mb-16 max-w-4xl text-center"
			use:fade={{ y: 30, duration: 1 }}
		>
			{#if data.subheader}
				<p
					class="font-secondary mb-4 text-[clamp(0.7rem,1.2vw,0.8rem)] uppercase tracking-[0.2em] text-primary opacity-60"
				>
					{data.subheader}
				</p>
			{/if}
			{#if data.header}
				<Headline headline={data.header} size="md" class="leading-tight -tracking-wide" />
				<div
					class="mx-auto mt-6 h-0.5 w-12 bg-primary opacity-30"
				></div>
			{/if}
		</header>
	{/if}

	{#if items.length}
		<div
			class="mx-auto grid max-w-9xl grid-cols-1 gap-[clamp(1rem,3vw,2.5rem)] md:grid-cols-4"
		>
			{#each items as stat, i (stat.id)}
				{@const Icon = stat.icon_key ? iconMap[stat.icon_key] : null}
				<article
					class="group relative overflow-hidden rounded-sm border border-gray-200 bg-white px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(2rem,4vw,3rem)] transition-colors duration-300 hover:border-primary {stat.wide
						? 'md:col-span-2'
						: ''}"
					use:fade={{ y: 40, delay: i * 0.08 }}
				>
					{#if Icon}
						<span
							class="pointer-events-none absolute -left-6 -top-13 size-48 text-primary opacity-[0.2] transition-opacity duration-500 group-hover:opacity-[0.12] *:first:block *:first:size-full"
						>
							<Icon />
						</span>
					{/if}

					<div class="relative mb-4">
						<span
							class="font-serif text-8xl font-bold tracking-wider text-primary-700 whitespace-nowrap"
							use:numberCounter={{
								value: stat.value,
								suffix: stat.suffix ?? "",
								duration: 2.5,
								delay: 0.1,
								separator: ",",
								ease: "power3.out",
							}}
						>
							0
						</span>
					</div>
					<h2
						class="relative mb-3 text-[clamp(1rem,1.8vw,1.25rem)] font-bold leading-snug text-sec-600"
					>
						{stat.label}
					</h2>
					{#if stat.description}
						<p
							class="relative max-w-152 text-[clamp(0.85rem,1.4vw,0.95rem)] leading-relaxed text-gray-500"
						>
							{stat.description}
						</p>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
	</Container>
</section>
