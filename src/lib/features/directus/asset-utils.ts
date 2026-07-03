/**
 * Directus asset URL utilities.
 *
 * Builds asset URLs with optional image transforms (width, height, quality, format).
 * Also provides responsive width calculations for srcset generation.
 * No network calls — pure URL string construction.
 */
import { env } from '$env/dynamic/public';
import { type DirectusFile } from '$lib/types/directus-schema';

export type DirectusImageLayout = 'constrained' | 'fullWidth' | 'fixed';

export type DirectusImageFit = 'contain' | 'cover' | 'inside' | 'outside';

export type DirectusImageFormat =
	| 'auto'
	| 'avif'
	| 'gif'
	| 'heif'
	| 'jpeg'
	| 'jpg'
	| 'png'
	| 'tiff'
	| 'webp';

export type DirectusImageTransform = [operation: string, ...(string | number | boolean)[]];

export interface DirectusAssetURLOptions {
	fit?: DirectusImageFit;
	format?: DirectusImageFormat;
	height?: number;
	quality?: number;
	transforms?: string | DirectusImageTransform[];
	width?: number;
	withoutEnlargement?: boolean;
}

interface DirectusResponsiveWidthsOptions {
	breakpoints?: number[];
	layout?: DirectusImageLayout;
	maxWidth?: number;
	width?: number;
}

const DEFAULT_RESPONSIVE_WIDTHS = [320, 480, 640, 768, 960, 1200, 1600, 1920, 2560, 3200];

const normalizeResponsiveWidth = (value: number): number => Math.max(1, Math.round(value));

const serializeTransforms = (transforms: DirectusAssetURLOptions['transforms']): string => {
	if (typeof transforms === 'string') return transforms;

	return JSON.stringify(transforms);
};

export const getDirectusAssetURL = (
	fileOrString: string | DirectusFile | null | undefined,
	options?: DirectusAssetURLOptions
): string => {
	if (!fileOrString) return '';

	const baseUrl = env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
	const id = typeof fileOrString === 'string' ? fileOrString : fileOrString.id;
	if (id.startsWith('http://') || id.startsWith('https://')) return id;

	const filename =
		typeof fileOrString !== 'string' ? (fileOrString.filename_download ?? null) : null;

	let assetUrl = `${baseUrl}/assets/${id}`;
	if (filename) assetUrl += `/${filename}`;

	if (options) {
		const params = new URLSearchParams();
		if (options.width) params.set('width', options.width.toString());
		if (options.height) params.set('height', options.height.toString());
		if (options.fit) params.set('fit', options.fit);
		if (options.format) params.set('format', options.format);
		if (options.quality) params.set('quality', options.quality.toString());
		if (options.transforms) params.set('transforms', serializeTransforms(options.transforms));
		if (options.withoutEnlargement) params.set('withoutEnlargement', 'true');
		const queryString = params.toString();
		if (queryString) assetUrl += `?${queryString}`;
	}

	return assetUrl;
};

export const getDirectusResponsiveWidths = ({
	breakpoints,
	layout = 'constrained',
	maxWidth,
	width,
}: DirectusResponsiveWidthsOptions = {}): number[] => {
	const baseWidths = (breakpoints?.length ? breakpoints : DEFAULT_RESPONSIVE_WIDTHS)
		.map(normalizeResponsiveWidth)
		.filter((value, index, values) => values.indexOf(value) === index)
		.sort((a, b) => a - b);

	if (!baseWidths.length) return [];

	const widthLimit = width ? normalizeResponsiveWidth(width) : undefined;
	const maxWidthLimit = maxWidth ? normalizeResponsiveWidth(maxWidth) : undefined;
	const effectiveMaxWidth =
		layout === 'fullWidth'
			? maxWidthLimit
			: widthLimit && maxWidthLimit
				? Math.min(widthLimit, maxWidthLimit)
				: widthLimit ?? maxWidthLimit;

	const filteredWidths =
		effectiveMaxWidth && effectiveMaxWidth > 0
			? baseWidths.filter((value) => value <= effectiveMaxWidth)
			: baseWidths;

	if (layout === 'fixed' && widthLimit) return [widthLimit];

	if (filteredWidths.length) {
		if (effectiveMaxWidth && filteredWidths[filteredWidths.length - 1] !== effectiveMaxWidth) {
			return [...filteredWidths, effectiveMaxWidth];
		}

		return filteredWidths;
	}

	return effectiveMaxWidth ? [effectiveMaxWidth] : [baseWidths[0]];
};

export const getDirectusDefaultSrcWidth = ({
	layout = 'constrained',
	responsiveWidths,
	width,
}: {
	layout?: DirectusImageLayout;
	responsiveWidths: number[];
	width?: number;
}): number | undefined => {
	if (layout === 'fixed' && width) return normalizeResponsiveWidth(width);

	return responsiveWidths[responsiveWidths.length - 1] ?? (width ? normalizeResponsiveWidth(width) : undefined);
};
