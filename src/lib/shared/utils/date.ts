export function formatDate(
	dateStr?: string | null,
	options: { month?: 'short' | 'long' } = {}
): string | null {
	if (!dateStr) return null;
	return new Date(dateStr).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: options.month ?? 'short',
		year: 'numeric',
	});
}
