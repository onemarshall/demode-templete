<script lang="ts">
	import {
		getDirectusAssetURL,
		getDirectusDefaultSrcWidth,
		getDirectusResponsiveWidths,
		type DirectusImageFit,
		type DirectusImageFormat,
		type DirectusImageLayout,
		type DirectusImageTransform,
	} from "$lib/features/directus/asset-utils";

	export interface Props {
		uuid: string | null | undefined;
		alt?: string;
		class?: string;
		decoding?: "async" | "auto" | "sync";
		fetchpriority?: "auto" | "high" | "low";
		fit?: DirectusImageFit;
		format?: DirectusImageFormat;
		loading?: "lazy" | "eager";
		width?: number;
		height?: number;
		layout?: DirectusImageLayout;
		maxWidth?: number;
		placeholder?: string;
		quality?: number;
		sizes?: string;
		fill?: boolean;
		breakpoints?: number[];
		draggable?: boolean;
		transforms?: string | DirectusImageTransform[];
		withoutEnlargement?: boolean;
		objectPosition?: string;
	}

	const getDefaultSizes = (
		layout: DirectusImageLayout,
		sizes?: string,
		width?: number,
	): string => {
		if (sizes) return sizes;
		if (layout === "fixed" && width) return `${width}px`;

		return "100vw";
	};

	const getLayoutStyle = (
		layout: DirectusImageLayout,
	): string | undefined => {
		if (layout === "fullWidth")
			return "width: 100%; height: 100%; object-fit: cover;";
		if (layout === "constrained") return "max-width: 100%; height: auto;";
		if (layout === "fixed") return "display: block;";

		return undefined;
	};

	const joinStyles = (
		...styles: Array<string | undefined>
	): string | undefined => {
		const filteredStyles = styles.filter(Boolean);

		return filteredStyles.length ? filteredStyles.join(" ") : undefined;
	};

	let {
		uuid,
		alt = "",
		class: className = "",
		decoding = "async",
		fetchpriority,
		fit,
		format,
		loading = "lazy",
		width,
		height,
		layout,
		maxWidth,
		placeholder,
		quality,
		fill = false,
		sizes,
		breakpoints,
		draggable = false,
		transforms,
		withoutEnlargement = false,
		objectPosition,
	}: Props = $props();

	const normalizedLayout = $derived<DirectusImageLayout>(
		fill ? "fullWidth" : (layout ?? (width ? "fixed" : "constrained")),
	);
	const normalizedFit = $derived<DirectusImageFit | undefined>(
		fit ?? (fill ? "cover" : undefined),
	);
	const normalizedSizes = $derived(
		getDefaultSizes(normalizedLayout, sizes, width),
	);
	const responsiveWidths = $derived(
		getDirectusResponsiveWidths({
			breakpoints,
			layout: normalizedLayout,
			maxWidth,
			width,
		}),
	);
	const srcWidth = $derived(
		getDirectusDefaultSrcWidth({
			layout: normalizedLayout,
			responsiveWidths,
			width,
		}),
	);
	const imageOptions = $derived({
		fit: normalizedFit,
		format,
		height,
		quality,
		transforms,
		withoutEnlargement,
	});
	const src = $derived(
		uuid
			? getDirectusAssetURL(uuid, {
					...imageOptions,
					width: srcWidth,
				})
			: "",
	);
	const srcset = $derived(
		uuid
			? responsiveWidths
					.map(
						(candidateWidth) =>
							`${getDirectusAssetURL(uuid, {
								...imageOptions,
								width: candidateWidth,
							})} ${candidateWidth}w`,
					)
					.join(", ")
			: "",
	);
	const imageStyle = $derived(
		joinStyles(
			placeholder ? `background: ${placeholder};` : undefined,
			getLayoutStyle(normalizedLayout),
			objectPosition ? `object-position: ${objectPosition};` : undefined,
		),
	);
</script>

{#if src}
	<img
		{src}
		{alt}
		{width}
		{height}
		{loading}
		{draggable}
		class={className}
		{decoding}
		{fetchpriority}
		srcset={srcset || undefined}
		sizes={normalizedSizes}
		style={imageStyle}
	/>
{/if}
