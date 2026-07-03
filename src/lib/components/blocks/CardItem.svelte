<script lang="ts">
	import { cn } from "$lib/utils";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { resolve } from "$app/paths";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import TextUnstyles from "$lib/components/ui/TextUnstyles.svelte";

	interface CardItem {
		id: string;
		title?: string | null;
		description?: string | null;
		content?: string | null;
		link?: string | null;
		image?: string | null | { id: string };
		tagline?: string | null;
		[key: string]:
			| string
			| number
			| boolean
			| null
			| undefined
			| Record<string, unknown>;
	}

	let { data } = $props<{
		data: CardItem;
	}>();

	const href = $derived(data.link ? resolve(data.link) : null);
</script>

<div
	class={cn("card-block")}
	data-directus={setAttr({
		collection: "block_card_items",
		item: data.id,
		fields: "title,description,content,link,image,tagline",
		mode: "popover",
	})}
>
	<div class="px-4 py-6 lg:px-0">
		{#if data?.image}
			<svelte:element
				this={href ? "a" : "div"}
				href={href ?? undefined}
				class="card-v11 group relative block overflow-hidden rounded-sm bg-neutral-300 text-white no-underline"
				aria-label={href ? data.title || "Card link" : undefined}
			>
				<DirectusImage
					uuid={typeof data.image === "object" && data.image !== null
						? data.image.id
						: data.image}
					alt={data.title || "Card background image"}
					layout="fullWidth"
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1280px) 75vw, (max-width: 1920px) 60vw, (max-width: 2560px) 40vw, 30vw"
					maxWidth={1600}
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<!-- <div class="absolute inset-0 bg-black/10"></div> -->
				<div
					class="absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:left-6 md:w-[calc(100%-3rem)] lg:w-3/5"
				>
					<div
						class="card-v11__box border border-white/10 bg-black/20 text-white shadow-2xl backdrop-blur-md"
					>
						<div class="px-6 pt-6 pb-5 md:px-8 md:pt-8">
							<div
								class="card-v11_number mb-5 text-[4.5rem] leading-none font-semibold tracking-[-0.06em] text-white/35 md:mb-8 md:text-[5.5rem]"
							></div>
							{#if data?.title}
								<h2
									class="max-w-xl text-3xl font-semibold tracking-tight text-white md:text-4xl"
								>
									{data.title}
								</h2>
							{/if}
							{#if data?.tagline || data?.description || data?.content}
								<div
									class="mt-5 max-w-xl space-y-2 text-sm leading-7 text-white/88 md:mt-6 md:text-base"
								>
									{#if data?.content}
										<div
											data-directus={setAttr({
												collection: "block_card_items",
												item: data.id,
												fields: "content",
												mode: "drawer",
											})}
										>
											<TextUnstyles
												content={data.content}
											/>
										</div>
									{/if}
								</div>
							{/if}
						</div>
						<div
							class="card-v11__btn flex h-14 items-center px-6 text-white transition-all duration-300 md:h-16 md:px-8 group-hover:rounded-sm group-hover:bg-white group-hover:text-neutral-900"
						>
							<svg
								class="card-v11__icon h-12 w-12 text-inherit"
								viewBox="0 0 48 48"
								aria-hidden="true"
							>
								<g
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="37" y1="14" x2="47" y2="24" />
									<line x1="47" y1="24" x2="37" y2="34" />
									<line x1="47" y1="24" x2="1.5" y2="24" />
								</g>
							</svg>
						</div>
					</div>
				</div>
			</svelte:element>
		{:else}
			<div
				class="rounded-sm border border-border/60 bg-card p-6 shadow-sm md:p-8"
			>
				{#if data?.title}
					<h2 class="mb-4 text-3xl font-semibold tracking-tight">
						{data.title}
					</h2>
				{/if}
				{#if data?.tagline}
					<p
						class="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground"
					>
						{data.tagline}
					</p>
				{/if}
				{#if data?.description}
					<p class="mb-4 text-base leading-7 text-muted-foreground">
						{data.description}
					</p>
				{/if}
				{#if data?.content}
					<TextUnstyles
						content={data?.content}
						data-directus={setAttr({
							collection: "block_card_items",
							item: data.id,
							fields: "content",
							mode: "drawer",
						})}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(:root) {
		--card-v11-height: 0dvh;
	}

	@media (orientation: landscape) {
		:global(:root) {
			--card-v11-height: 85dvh;
		}
	}

	@media (min-width: 32rem) and (orientation: landscape) {
		:global(:root) {
			--card-v11-height: 45dvh;
		}
	}

	@media (min-width: 32rem) and (orientation: portrait) {
		:global(:root) {
			--card-v11-height: 35dvh;
		}
	}

	@media (min-width: 48rem) {
		:global(:root) {
			--card-v11-height: 70dvh;
		}
	}

	.card-v11 {
		height: var(--card-v11-height);
		min-height: 28rem;
	}

	.card-v11__box {
		backdrop-filter: blur(10px);
	}

	.card-v11_number::before {
		content: counter(subsection, decimal-leading-zero) " ";
	}

	.card-block {
		counter-increment: subsection;
	}

	.card-v11__icon line:nth-child(1),
	.card-v11__icon line:nth-child(2) {
		transform-origin: 47px 24px;
		opacity: 0;
		transition:
			opacity 0s 0.2s,
			transform 0.2s ease-in-out;
	}

	.card-v11__icon line:nth-child(1) {
		transform: rotate(-45deg);
	}

	.card-v11__icon line:nth-child(2) {
		transform: rotate(45deg);
	}

	.card-v11__icon line:nth-child(3) {
		stroke-dasharray: 48;
		stroke-dashoffset: 72;
		transition: stroke-dashoffset 0.2s 0.2s ease-in-out;
	}

	.group:hover .card-v11__icon line:nth-child(1),
	.group:hover .card-v11__icon line:nth-child(2) {
		opacity: 1;
		transform: rotate(0deg);
		transition:
			opacity 0s 0.2s,
			transform 0.2s 0.2s ease-in-out;
	}

	.group:hover .card-v11__icon line:nth-child(3) {
		stroke-dashoffset: 96;
		transition: stroke-dashoffset 0.2s ease-in-out;
	}
</style>
