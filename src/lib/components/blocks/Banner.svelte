<script lang="ts">
	import { cn } from "$lib/utils";
	import BaseText from "$lib/components/ui/Text.svelte";
	import { setAttr } from "$lib/services/directus/visualEditing";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import { fade } from "scripts/actions";
	import type { ButtonProps } from "./Button.svelte";

	interface BannerData {
		id: string | number;
		name?: string;
		title?: string;
		content?: string;
		show_content?: boolean;
		theme?: string;
		image?: string;
		button_group?: {
			id: string;
			buttons?: Array<Record<string, unknown>>;
		} | null;
	}

	interface BannerBlock extends BannerData {
		banner_reference?: BannerData;
	}

	let { data }: { data: BannerBlock } = $props();
	const bannerData = $derived(data?.banner_reference || data);
	const title = $derived(bannerData?.title ?? "");
	const content = $derived(bannerData?.content ?? "");
	const image = $derived(bannerData?.image ?? null);
	const showContent = $derived(bannerData?.show_content !== false);
	const theme = $derived(bannerData?.theme ?? "primary");
	const bannerId = $derived(bannerData?.id);

	const buttons = $derived<ButtonProps[]>(
		(bannerData?.button_group?.buttons ?? []).map(
			(button: Record<string, unknown>) => {
				const btn = (button.block_button_id ?? button) as Record<
					string,
					unknown
				>;
				return {
					id: btn.id as string,
					label: btn.label as string | null,
					variant:
						(btn.variant as ButtonProps["variant"]) ?? "outline",
					url: btn.url as string | null,
					type: btn.type as ButtonProps["type"],
					page: btn.page as { permalink: string | null } | undefined,
					post: btn.post as { slug: string | null } | undefined,
					button_size:
						(btn.button_size as ButtonProps["button_size"]) || "lg",
				};
			},
		),
	);

	const isPrimary = $derived(theme === "primary");

	const bannerHref = $derived.by(() => {
		const btn = buttons[0];
		if (!btn) return null;
		if (btn.type === "page" && btn.page?.permalink)
			return btn.page.permalink;
		if (btn.type === "post" && btn.post?.slug)
			return `/news/${btn.post.slug}`;
		if (btn.url) return btn.url;
		return null;
	});

	const bannerLabel = $derived(buttons[0]?.label ?? "Learn more");
</script>

<section
	class="py-2 lg:py-5"
	data-directus={setAttr({
		collection: "block_banner_cta",
		item: bannerId,
		fields: "title,content,image,show_content,theme,button_group",
		mode: "drawer",
	})}
>
	<Container>
		<a
			href={bannerHref || "#"}
			class={cn(
				"banner group relative block overflow-hidden rounded-sm no-underline cursor-pointer",
				isPrimary ? "bg-primary-800" : "bg-sec-800",
			)}
		>
			<div class="grid items-center lg:grid-cols-2">
				<!-- Content -->
				<div
					use:fade={{ x: -30, duration: 1.2 }}
					class="relative z-10 space-y-6 p-8 lg:p-12 xl:p-16"
				>
					<Headline
						headline={title}
						size="md"
						class="leading-tight tracking-tight text-white text-balance"
					/>

					{#if showContent && content}
						<div class="text-[0.95rem] leading-relaxed">
							<BaseText {content} class="prose-invert" />
						</div>
					{/if}

					{#if bannerLabel}
						<span
							class="banner__cta inline-flex items-center gap-2 rounded-full border-2 border-white px-9 py-3 text-sm font-medium text-white transition-colors group-hover:bg-white group-hover:text-primary-800"
						>
							{bannerLabel}
							<svg
								class="size-4"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="3" y1="8" x2="13" y2="8" />
								<polyline points="9 4 13 8 9 12" />
							</svg>
						</span>
					{/if}
				</div>

				<!-- Image -->
				{#if image}
					<div
						use:fade={{ x: 30, duration: 1.4 }}
						class="banner__figure relative h-64 lg:h-full"
					>
						<DirectusImage
							uuid={image}
							alt={title}
							class="absolute inset-0 h-full w-full object-cover"
							fill
							sizes="(min-width: 1024px) 50vw, 100vw"
						/>
					</div>
				{/if}
			</div>
		</a>
	</Container>
</section>

<style>
	/* Clip-path image reveal */
	@media (min-width: 64rem) {
		:global(.banner__figure) {
			clip-path: polygon(100px 0%, 100% 0%, 100% 100%, 50px 100%);
			transition: clip-path 0.6s cubic-bezier(0.33, 1, 0.68, 1);
		}

		:global(.banner:hover .banner__figure) {
			clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
		}
	}
</style>
