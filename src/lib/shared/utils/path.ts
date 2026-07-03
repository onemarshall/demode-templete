export const normalizePath = (path: string): string => {
	const trimmed = path.trim();
	if (!trimmed || trimmed === '/') return '/';
	const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
	return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};
