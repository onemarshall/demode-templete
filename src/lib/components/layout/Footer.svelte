<script lang="ts">
	import type { Component } from "svelte";
	import type {
		NavigationItem,
		NavigationTree,
		SiteGlobals,
	} from "$lib/content/schema";
	import {
		Linkedin,
		Instagram,
		XTwitter,
		Facebook,
		Youtube,
		Github,
		Discord,
		Telegram,
		Whatsapp,
		Mastodon,
		Bluesky,
		Threads,
		TikTok,
		Reddit,
		Pinterest,
		Medium,
		Dribbble,
		Behance,
		Soundcloud,
		Vimeo,
		Twitch,
		Skype,
		Slack,
		Messenger,
		Wechat,
		Weibo,
		QQ,
		VK,
		RSS,
	} from "$lib/components/icons";
	import Copyright from "$lib/components/layout/Copyright.svelte";
	import Logo from "./SiteLogo.svelte";
	import NewsletterForm from "./NewsletterForm.svelte";
	import { resolve } from "$app/paths";

	const socialIconMap: Record<string, Component<{ class?: string }>> = {
		linkedin: Linkedin,
		instagram: Instagram,
		x: XTwitter,
		twitter: XTwitter,
		facebook: Facebook,
		youtube: Youtube,
		github: Github,
		discord: Discord,
		telegram: Telegram,
		whatsapp: Whatsapp,
		mastodon: Mastodon,
		bluesky: Bluesky,
		threads: Threads,
		tiktok: TikTok,
		reddit: Reddit,
		pinterest: Pinterest,
		medium: Medium,
		dribbble: Dribbble,
		behance: Behance,
		soundcloud: Soundcloud,
		vimeo: Vimeo,
		twitch: Twitch,
		skype: Skype,
		slack: Slack,
		messenger: Messenger,
		wechat: Wechat,
		weibo: Weibo,
		qq: QQ,
		vk: VK,
		rss: RSS,
	};

	interface Props {
		navigation?: NavigationTree;
		copyrightNavigation?: NavigationTree;
		globals?: SiteGlobals;
		ctaHref?: string;
		ctaLabel?: string;
		theme?: string;
		style?: string;
	}

	let {
		navigation = [],
		copyrightNavigation = [],
		globals,
		ctaHref,
		ctaLabel = "Contact us",
		theme = "primary",
		style = "f9",
	}: Props = $props();

	const visibleNavItems = $derived(
		navigation.filter((item) => item.is_visible !== false),
	);

	function itemHref(item: NavigationItem): string {
		return item.url ?? item.page?.permalink ?? item.post?.permalink ?? "/";
	}
</script>

<footer class="bg-primary-800 text-white footer-v9 {style}" data-theme={theme}>
	<div
		class="w-[calc(100%-2.5rem)] lg:w-[calc(100%-4rem)] mx-auto max-w-8xl pt-10"
	>
		<!-- Top Section: Logo + Description | Contact Button -->
		<div
			class="flex flex-col md:flex-row md:items-start md:justify-between gap-6 py-10 pb-8"
		>
			<div class="wrapper">
				<Logo
					{globals}
					variant="wordmark"
					style="logo block w-[8.5rem] sm:w-[10rem] md:w-[12rem] lg:w-[14rem]"
					svgClass="block h-auto w-full"
					fill="currentColor"
				/>

				{#if globals?.description}
					<div class="col">
						<p
							class="text-balance max-w-xs mt-5 text-base lg:text-xl text-foreground"
						>
							{globals.description}
						</p>
					</div>
				{/if}
			</div>

			{#if ctaHref}
				<a
					href={resolve(ctaHref as "/")}
					class="inline-flex items-center justify-center rounded-full border border-white/60 px-8 py-3 uppercase tracking-widest text-sm hover:bg-white/10 transition-colors shrink-0"
				>
					{ctaLabel}
				</a>
			{/if}
		</div>

		<!-- Middle Section: Newsletter/Social | Navigation Columns -->
		<div class="grid grid-cols-12 border-t border-white/20">
			<!-- Left: Newsletter + Social Icons -->
			<div
				class="col-span-12 md:col-span-4 md:border-r md:border-white/20 md:pr-10 pb-8 md:pb-0 py-15"
			>
				<div class="space-y-8">
					<!-- Newsletter -->
					<NewsletterForm />

					<!-- Social Icons -->
					{#if globals?.social_links?.length}
						<ul class="flex gap-3" aria-label="Social media links">
							{#each globals.social_links.filter( (s) => ["linkedin", "instagram", "x", "twitter", "facebook", "youtube"].includes(s.service), ) as social (social.service)}
								{@const Icon = socialIconMap[social.service]}
								<li>
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									<a
										data-sveltekit-preload-data="off"
										href={social.url}
										aria-label={social.label ||
											social.service}
										class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
										target="_blank"
										rel="noopener noreferrer"
									>
										{#if Icon}
											<span
												aria-hidden="true"
												class="flex justify-center items-center"
											>
												<Icon class=" w-5 h-5" />
											</span>
										{:else}
											{social.label || social.service}
										{/if}
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<!-- Right: Navigation Columns -->
			<div class="col-span-12 md:col-span-8 md:pl-10 md:py-20">
				<div
					class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 md:px-10 pb-7"
				>
					{#each visibleNavItems as item (item.id)}
						<div class="space-y-4">
							<h4 class="font-bold text-base">{item.title}</h4>
							{#if item.children?.length}
								<ul class="space-y-3">
									{#each item.children.filter((c) => c.is_visible !== false) as child (child.id)}
										<li>
											<a
												href={resolve(
													itemHref(child) as "/",
												)}
												class="text-sm text-white/70 hover:text-white transition-colors"
											>
												{child.title}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Bottom Section: Copyright | Legal Links -->
		<div class="border-t border-white/20 pt-6 pb-8">
			<Copyright
				{globals}
				navigation={copyrightNavigation.filter(
					(i) => i.is_visible !== false,
				)}
			/>
		</div>
	</div>
</footer>
