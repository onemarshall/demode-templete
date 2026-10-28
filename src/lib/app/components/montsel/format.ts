/** Date formatting shared by the Montsel pages. UTC keeps SSR and client output identical. */

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});

export function formatDate(value: string | null | undefined): string {
	if (!value) return '';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
}

export function firstName(name: string | null | undefined, email: string): string {
	const source = name?.trim() || email.split('@')[0] || '';
	return source.split(/\s+/)[0] ?? '';
}

export function formatLabel(format: 'web_page' | 'report' | 'document'): string {
	return format === 'web_page' ? 'Web page' : format === 'report' ? 'Report' : 'Document';
}
