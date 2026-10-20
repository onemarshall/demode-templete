<script lang="ts" module>
	import type { HTMLImgAttributes } from "svelte/elements";
	import {
		getDirectusAssetURL,
		getDirectusDefaultSrcWidth,
		getDirectusResponsiveWidths,
		getDirectusSrcset,
		isDirectusTransformableImage,
		scaleDirectusHeight,
		type DirectusImageFit,
		type DirectusImageFormat,
		type DirectusImageLayout,
		type DirectusImageSource,
		type DirectusImageTransform,
	} from "$lib/services/directus/asset-utils";

	export interface Props
		extends Omit<
			HTMLImgAttributes,
			| "src"
			| "srcset"
			| "sizes"
			| "width"
			| "height"
			| "loading"
			| "decoding"
			| "fetchpriority"
			| "class"
			| "style"
			| "alt"
			| "draggable"
		> {
		uuid: DirectusImageSource | null | undefined;
		alt?: string;
		class?: string;
		decoding?: "async" | "auto" | "sync";
		fetchpriority?: "auto" | "high" | "low";
		fit?: DirectusImageFit;
		format?: DirectusImageFormat;
		formats?: Array<"avif" | "webp" | "jpg" | "png">;
		loading?: "lazy" | "eager";
		width?: number;
		height?: number;
		layout?: DirectusImageLayout;
		maxWidth?: number;
		placeholder?: string;
		priority?: boolean;
		quality?: number;
		sizes?: string;
		fill?: boolean;
		breakpoints?: number[];
		draggable?: boolean;
		style?: string;
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

	const getLayoutClass = (layout: DirectusImageLayout): string => {
		if (layout === "fullWidth") return "size-full object-cover";
		if (layout === "constrained") return "max-w-full h-auto";

		return "block";
	};

	const joinStyles = (
		...styles: Array<string | undefined>
	): string | undefined => {
		const filteredStyles = styles.filter(Boolean);

		return filteredStyles.length ? filteredStyles.join(" ") : undefined;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils";

	let {
		uuid,
		alt,
		class: className = "",
		decoding = "async",
		fetchpriority,
		fit,
		format,
		formats,
		loading,
		width,
		height,
		layout,
		maxWidth,
		placeholder,
		priority = false,
		quality,
		fill = false,
		sizes,
		breakpoints,
		draggable = false,
		style,
		transforms,
		withoutEnlargement = false,
		objectPosition,
		...rest
	}: Props = $props();

	const file = $derived(
		typeof uuid === "object" && uuid !== null ? uuid : null,
	);
	const fileId = $derived<string | null | undefined>(
		file ? file.id : (uuid as string | null | undefined),
	);
	const resolvedAlt = $derived(alt ?? file?.title ?? "");
	const imgWidth = $derived<number | undefined>(
		width ?? file?.width ?? undefined,
	);
	const imgHeight = $derived<number | undefined>(
		height ??
			(width && file?.width && file?.height
				? Math.round((width * file.height) / file.width)
				: (file?.height ?? undefined)),
	);
	const normalizedLayout = $derived<DirectusImageLayout>(
		fill ? "fullWidth" : (layout ?? (width ? "fixed" : "constrained")),
	);
	const normalizedFit = $derived<DirectusImageFit | undefined>(
		fit ?? (fill ? "cover" : undefined),
	);
	const normalizedSizes = $derived(
		normalizedLayout === "fixed" && width
			? undefined
			: getDefaultSizes(normalizedLayout, sizes, width),
	);
	const effectiveMaxWidth = $derived(
		maxWidth ?? (width ? undefined : 1920),
	);
	const responsiveWidths = $derived(
		getDirectusResponsiveWidths({
			breakpoints,
			layout: normalizedLayout,
			maxWidth: effectiveMaxWidth,
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
		quality,
		transforms,
		withoutEnlargement,
	});
	const src = $derived(
		fileId
			? getDirectusAssetURL(fileId, {
					...imageOptions,
					width: srcWidth,
					height: srcWidth
						? scaleDirectusHeight(height, width, srcWidth)
						: undefined,
				})
			: "",
	);
	const srcset = $derived(
		fileId
			? getDirectusSrcset(fileId, {
					...imageOptions,
					layout: normalizedLayout,
					widths: responsiveWidths,
					width,
					height,
				})
			: "",
	);
	const resolvedFormats = $derived(
		format || (file && !isDirectusTransformableImage(file.type))
			? []
			: (formats ?? (["avif", "webp"] as const)),
	);
	const sourceSrcsets = $derived(
		fileId
			? resolvedFormats.map((sourceFormat) => ({
					format: sourceFormat,
					srcset: getDirectusSrcset(fileId, {
						...imageOptions,
						format: sourceFormat,
						layout: normalizedLayout,
						widths: responsiveWidths,
						width,
						height,
					}),
				}))
			: [],
	);
	const resolvedLoading = $derived(
		loading ?? (priority || fetchpriority === "high" ? "eager" : "lazy"),
	);
	const resolvedFetchpriority = $derived(
		fetchpriority ?? (priority ? "high" : undefined),
	);
	const imageStyle = $derived(
		joinStyles(
			placeholder ? `background: ${placeholder};` : undefined,
			objectPosition ? `object-position: ${objectPosition};` : undefined,
			style,
		),
	);
</script>

{#snippet imageTag()}
	<img
		{...rest}
		{src}
		alt={resolvedAlt}
		width={imgWidth}
		height={imgHeight}
		loading={resolvedLoading}
		{draggable}
		class={cn(getLayoutClass(normalizedLayout), className)}
		{decoding}
		fetchpriority={resolvedFetchpriority}
		srcset={srcset || undefined}
		sizes={normalizedSizes}
		style={imageStyle}
	/>
{/snippet}

{#if src}
	{#if sourceSrcsets.length}
		<picture class="contents">
			{#each sourceSrcsets as s (s.format)}
				<source
					type={`image/${s.format}`}
					srcset={s.srcset}
					sizes={normalizedSizes}
				/>
			{/each}
			{@render imageTag()}
		</picture>
	{:else}
		{@render imageTag()}
	{/if}
{/if}
