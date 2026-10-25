import { describe, expect, it } from 'vitest';
import { resolveUserImage } from '../session-serializer.js';

const FILE_ID = 'ea5b96ac-9ce9-4a69-927d-0c08846c62ad';

describe('resolveUserImage', () => {
	it('returns null for empty values', () => {
		expect(resolveUserImage(null)).toBeNull();
		expect(resolveUserImage(undefined)).toBeNull();
		expect(resolveUserImage('')).toBeNull();
		expect(resolveUserImage('   ')).toBeNull();
		expect(resolveUserImage(42)).toBeNull();
	});

	it('drops relative paths', () => {
		expect(resolveUserImage('/assets/foo.png')).toBeNull();
	});

	it('keeps non-CMS absolute URLs untouched', () => {
		expect(resolveUserImage('https://lh3.googleusercontent.com/a/abc')).toBe(
			'https://lh3.googleusercontent.com/a/abc'
		);
	});

	it('re-resolves a bare CMS file id to the configured CMS host', () => {
		const resolved = resolveUserImage(FILE_ID);
		expect(resolved).toContain(`/assets/${FILE_ID}`);
		expect(resolved).not.toContain('localhost');
	});

	it('re-resolves a stale CMS asset URL to the configured CMS host', () => {
		const resolved = resolveUserImage(`http://localhost:8059/assets/${FILE_ID}`);
		expect(resolved).toContain(`/assets/${FILE_ID}`);
		expect(resolved).not.toContain('localhost');
		expect(resolved?.startsWith('https://')).toBe(true);
	});
});
