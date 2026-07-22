<script lang="ts">
	import {
		Directors,
		About,
		ResearchFellows,
		Aims,
		OurNews,
		OurResearch,
		History,
		Impact,
		AnimalEthics,
		LatestNews,
		Commentary,
		Video,
		ResearchAreas,
		CentreBooks,
		PMAnimalEthicsSeries,
		JournalOfAnimalEthics,
		Fellows,
		HonoraryFellows,
		ApplyToBeAFellow,
		PreviousMeetings,
		TheAnimalThing,
	} from "$lib/icons";
	import { getContext } from "svelte";
	import { slide } from "svelte/transition";
	import type { Component } from "svelte";
	import type { SVGAttributes } from "svelte/elements";
	import { contenNavigationContext } from "$lib/content/context";
	import type { NavigationItem, NavigationTree } from "$lib/content/schema";
	import SiteLogo from "$lib/components/layout/SiteLogo.svelte";
	import type { SiteGlobals } from "$lib/content/schema";
	import { Button } from "$lib/components/ui/button";
	import * as NavigationMenu from "$lib/components/ui/navigation-menu";

	interface Props {
		globals?: SiteGlobals;
	}

	let { globals }: Props = $props();

	type IconComponent = Component<SVGAttributes<SVGSVGElement>>;

	const iconByKey: Record<string, unknown> = {
		directors: Directors,
		about: About,
		ournews: OurNews,
		ourresearch: OurResearch,
		researchfellows: ResearchFellows,
		aims: Aims,
		history: History,
		impact: Impact,
		animalethics: AnimalEthics,
		latestnews: LatestNews,
		commentary: Commentary,
		video: Video,
		researchareas: ResearchAreas,
		centrebooks: CentreBooks,
		pmanimalethicsseries: PMAnimalEthicsSeries,
		journalofanimalethics: JournalOfAnimalEthics,
		fellows: Fellows,
		honoraryfellows: HonoraryFellows,
		applytoobeafellow: ApplyToBeAFellow,
		previousmeetings: PreviousMeetings,
		theanimalth: TheAnimalThing,
	};

	const getNavigation = getContext<() => NavigationTree>(
		contenNavigationContext,
	);

	const navigation = $derived(
		(getNavigation?.() ?? []).filter((item) => item.is_visible !== false),
	);

	const hasPublishedContent = (item: NavigationItem): boolean => {
		if (item.type === "page") return item.page?.status === "published";
		if (item.type === "post") return item.post?.status === "published";
		return true;
	};

	const showInMenu = (item: NavigationItem): boolean =>
		item.is_visible !== false &&
		item.show_in_navbar !== false &&
		hasPublishedContent(item);

	const url = (item: NavigationItem): string | undefined =>
		item.url ?? item.page?.permalink ?? item.post?.permalink;

	const getChildren = (item: NavigationItem): NavigationItem[] => {
		if (item.hide_dropdown === true) return [];
		const children = (item.children ?? []).filter(showInMenu);
		return children;
	};

	const normalizeIconKey = (key: string): string =>
		key.toLowerCase().replace(/[-_\s]/g, "");

	const getIcon = (item: NavigationItem): IconComponent | null => {
		if (typeof item.icon !== "string") return null;
		const icon = iconByKey[normalizeIconKey(item.icon)];
		return icon ? (icon as IconComponent) : null;
	};

	let mobileOpen = $state(false);
	let lastScrollY = $state(0);
	let mobileHeaderVisible = $state(true);

	const closeMobileMenu = () => {
		mobileOpen = false;
	};

	const handleWindowScroll = () => {
		if (typeof window === "undefined") return;
		if (window.innerWidth >= 1024) return;
		if (mobileOpen) {
			lastScrollY = window.scrollY;
			mobileHeaderVisible = true;
			return;
		}

		const currentScrollY = window.scrollY;
		const delta = currentScrollY - lastScrollY;

		if (currentScrollY <= 0) {
			mobileHeaderVisible = true;
		} else if (delta > 8) {
			mobileHeaderVisible = false;
		} else if (delta < -8) {
			mobileHeaderVisible = true;
		}

		lastScrollY = currentScrollY;
	};

	$effect(() => {
		if (mobileOpen) {
			mobileHeaderVisible = true;
		}
	});
</script>

<svelte:window onscroll={handleWindowScroll} />

{#snippet navIcon(ChildIcon: IconComponent | null, large?: boolean)}
	{#if ChildIcon}
		<span
			class={[
				"nav-icon icon inline-block leading-none shrink-0 transition-colors duration-200",
				large ? "nav-icon--large" : "nav-icon--small",
			]}
		>
			<ChildIcon />
		</span>
	{:else}
		<svg
			class={[
				"icon inline-block fill-current leading-none shrink-0 text-primary-400 group-hover:text-primary-700 transition-colors duration-200",
				large ? "w-6 h-6" : "w-4 h-4",
			]}
			viewBox="0 0 16 16"
		>
			<g fill="currentColor"><circle cx="8" cy="8" r="3"></circle></g>
		</svg>
	{/if}
{/snippet}

{#snippet arrowIcon()}
	<svg
		class="icon inline-block text-inherit fill-current leading-none shrink-0 w-[12px] h-[12px]"
		viewBox="0 0 12 12"
	>
		<g fill="currentColor">
			<path
				d="M1,7H8.586L6.293,9.293a1,1,0,1,0,1.414,1.414l4-4a1,1,0,0,0,0-1.416l-4-4A1,1,0,0,0,6.293,2.707L8.586,5H1A1,1,0,0,0,1,7Z"
			></path>
		</g>
	</svg>
{/snippet}

{#snippet renderMobileItems(items: NavigationItem[])}
	<ul class="grid grid-cols-12 gap-y-8">
		{#each items.filter(showInMenu) as item (item.id)}
			{@const children = getChildren(item)}
			<li class="col-span-12">
				<p class="text-xs uppercase tracking-widest text-gray-400 mb-5">
					{item.title}
				</p>

				<ul class="grid grid-cols-12 gap-y-5 sm:gap-5">
					{#each children as child (child.id)}
						{@const ChildIcon = getIcon(child)}
						{@const childUrl = url(child)}
						<li class="col-span-12 sm:col-span-6 group">
							{#if childUrl}
								<a
									href={childUrl}
									class="flex items-center"
									onclick={closeMobileMenu}
								>
									<figure
										class="shrink-0 flex items-center justify-center rounded-full h-[48px] w-[48px] mr-3 bg-primary-300/20"
									>
										{@render navIcon(ChildIcon)}
									</figure>
									<div>
										<p
											class="morph-link-title inline-flex items-center gap-1 text-gray-900 font-medium mb-0.5 lg:mb-1"
										>
											<span>{child.title}</span>
											{@render arrowIcon()}
										</p>
										<p class="text-gray-400 text-xs">
											{child.label || ""}
										</p>
									</div>
								</a>
							{:else}
								<span class="flex items-center">
									<figure
										class="shrink-0 flex items-center justify-center rounded-full h-[48px] w-[48px] mr-3 bg-primary-300/20"
									>
										{@render navIcon(ChildIcon)}
									</figure>
									<div>
										<p
											class="text-gray-900 font-medium mb-0.5 lg:mb-1"
										>
											<span>{child.title}</span>
										</p>
										<p class="text-gray-400">
											{child.label || ""}
										</p>
									</div>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
{/snippet}

<header class="relative z-50 h-[50px] lg:h-[70px] md:mt-10">
	<!-- mobile -->
	<div class="h-[96px] lg:hidden" aria-hidden="true"></div>
	<div
		class={[
			"fixed left-0 right-0 top-0 z-50 px-4 pt-4 transition-transform duration-300 lg:hidden",
			mobileHeaderVisible ? "translate-y-0" : "-translate-y-full",
		]}
	>
		<div
			class="mx-auto flex h-[64px] max-w-7xl items-center justify-between rounded-full border border-white/10 bg-primary-900/95 px-3 shadow-[0_18px_50px_rgba(7,21,42,0.28)] backdrop-blur"
		>
			<div class="flex min-w-0 items-center">
				<div class="flex h-12 items-center rounded-full px-3 shadow-sm">
					<SiteLogo
						{globals}
						variant="circle"
						style="block w-[6.5rem] shrink-0"
						svgClass="block h-auto w-full"
						fill="var(--color-white)"
					/>
				</div>
			</div>

			<button
				class="flex h-12 w-12 items-center justify-center text-white shadow-sm transition-transform duration-200 active:scale-95"
				aria-expanded={mobileOpen}
				aria-label="Toggle mobile menu"
				onclick={() => (mobileOpen = !mobileOpen)}
			>
				{#if mobileOpen}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="22"
						height="22"
						viewBox="0 0 24 24"
					>
						<title>xmark</title>
						<g
							fill="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							transform="translate(0.5 0.5)"
						>
							<line
								x1="19"
								y1="19"
								x2="5"
								y2="5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							></line>
							<line
								x1="19"
								y1="5"
								x2="5"
								y2="19"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							></line>
						</g>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="22"
						height="22"
						viewBox="0 0 24 24"
					>
						<title>menu</title>
						<g fill="currentColor">
							<rect
								x="2"
								y="5"
								width="20"
								height="2"
								fill="currentColor"
								stroke-width="0"
							></rect>
							<rect
								x="2"
								y="11"
								width="20"
								height="2"
								stroke-width="0"
								fill="currentColor"
							></rect>
							<rect
								x="2"
								y="17"
								width="20"
								height="2"
								stroke-width="0"
								fill="currentColor"
							></rect>
						</g>
					</svg>
				{/if}
			</button>
		</div>

		{#if mobileOpen}
			<div
				class="absolute left-4 right-4 top-full z-40 mt-3 overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(7,21,42,0.22)]"
				transition:slide={{ duration: 300 }}
			>
				<div
					class="max-h-[calc(100vh-7rem)] overflow-auto border-t border-gray-200/70 py-6 lg:py-8"
				>
					<nav class="mx-auto w-[calc(100%-2.5rem)] max-w-7xl">
						{@render renderMobileItems(navigation)}
					</nav>
				</div>
			</div>
		{/if}
	</div>

	<!-- desktop -->
	<div class="hidden lg:block h-full items-center">
		<nav
			class="mx-auto max-w-5xl h-20 flex items-center justify-between bg-primary-900 rounded-full px-6 pl-8"
		>
			<SiteLogo
				{globals}
				variant="circle"
				style="relative z-[2]"
				svgClass="relative h-[140px] z-[140]"
				fill="var(--color-primary-900)"
			/>

			<NavigationMenu.Root class="relative z-1" viewport={false}>
				<NavigationMenu.List class="gap-0">
					{#each navigation.filter(showInMenu) as item (item.id)}
						{@const children = getChildren(item)}
						<NavigationMenu.Item>
							{#if children.length > 0}
								<NavigationMenu.Trigger
									class="bg-transparent! text-white text-base font-medium px-5 py-2 hover:bg-white/10! focus:bg-white/10! data-[state=open]:bg-white/10! rounded-full transition-colors duration-200"
								>
									{item.title}
								</NavigationMenu.Trigger>

								<NavigationMenu.Content
									class="overflow-visible! rounded-xl! shadow-xl! border-0! bg-gray-200 mt-4!"
									style="inset-inline-start: 50%; margin-inline-start: -310px;"
								>
									<!-- arrow -->
									<div
										class="absolute-top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-200 rotate-45 rounded-[2px] shadow-[-1px_-1px_2px_0px_rgba(0,0,0,0.08)] z-10"
									></div>
									<ul
										class="grid w-[600px] grid-cols-2 gap-1 p-3 lg:p-3"
									>
										{#each children as child (child.id)}
											{@const ChildIcon = getIcon(child)}
											{@const childUrl = url(child)}
											<li
												class="icons border border-transparent hover:border-gray-300 hover:bg-gray-200 rounded-md transition-all duration-200 p-3 hover:shadow-lg"
											>
												{#if childUrl}
													<a
														href={childUrl}
														class="flex items-center"
													>
														<figure
															class="shrink-0 flex items-center justify-center rounded-full h-[48px] w-[48px] mr-2 bg-primary-200/20"
														>
															{@render navIcon(
																ChildIcon,
																true,
															)}
														</figure>
														<div
															class="text-sm lg:text-base"
														>
															<p
																class="morph-link-title inline-flex items-center gap-1 text-gray-900 font-medium mb-0.5 lg:mb-0.8"
															>
																<span
																	>{child.title}</span
																>
																{@render arrowIcon()}
															</p>
															<p
																class="text-gray-400 text-xs leading-tight"
															>
																{child.label ||
																	""}
															</p>
														</div>
													</a>
												{:else}
													<span
														class="flex items-center"
													>
														<figure
															class="shrink-0 flex items-center justify-center rounded-full h-[48px] w-[48px] mr-5 bg-primary-600/20"
														>
															{@render navIcon(
																ChildIcon,
															)}
														</figure>
														<!-- <div class="text-sm lg:text-base">
															<p class="text-gray-900 font-medium mb-0.5 lg:mb-1">
																<span>{child.title}</span>
															</p>
															<p class="text-gray-400">{child.label || ''}</p>
														</div> -->
													</span>
												{/if}
											</li>
										{/each}
									</ul>
								</NavigationMenu.Content>
							{:else}
								{@const itemUrl = url(item)}
								{#if itemUrl}
									<NavigationMenu.Link
										href={itemUrl}
										class="bg-transparent! text-white text-base font-medium px-5 py-2 hover:bg-white/10! rounded-full transition-colors duration-200 flex-row!"
									>
										{item.title}
									</NavigationMenu.Link>
								{:else}
									<span
										class="text-white text-base font-medium px-5 py-2"
										>{item.title}</span
									>
								{/if}
							{/if}
						</NavigationMenu.Item>
					{/each}
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<!-- <button
				aria-label="Contact us"
				class="rounded-full bg-primary-600 hover:bg-accent text-white px-4 py-2"
			>
				Contact
			</button> -->
		</nav>
	</div>
</header>

<style>
	/* Arrow hover animation on links */
	:global(.morph-link-title .icon) {
		opacity: 0;
		transform: translateX(-0.5em);
		transition:
			opacity 0.2s,
			transform 0.2s;
	}
	:global(a:hover .morph-link-title .icon) {
		opacity: 1;
		transform: translateX(0);
	}

	/* .nav-icon {
		color: var(--color-primary);
	} */

	.nav-icon--small {
		width: 1rem;
		height: 1rem;
	}

	.nav-icon--large {
		width: 2.75rem;
		height: 2.75rem;
	}

	:global(.nav-icon svg) {
		display: block;
		width: 100%;
		height: 100%;
		color: var(--color-primary-400);
		transition:
			fill 0.2s,
			stroke 0.2s,
			color 0.2s;
	}
	:global(.icons:hover .nav-icon svg) {
		color: var(--color-primary-700);
	}
</style>
