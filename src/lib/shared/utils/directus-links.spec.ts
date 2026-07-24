import { describe, it, expect } from 'vitest';
import { resolveDirectusLink } from './directus-links';

describe('resolveDirectusLink', () => {
	it('returns unknown for null/undefined input', () => {
		expect(resolveDirectusLink(null)).toEqual({ href: null, isExternal: false, kind: 'unknown' });
		expect(resolveDirectusLink(undefined)).toEqual({ href: null, isExternal: false, kind: 'unknown' });
	});

	it('resolves a plain string URL', () => {
		expect(resolveDirectusLink('/about')).toEqual({ href: '/about', isExternal: false, kind: 'string' });
		expect(resolveDirectusLink('https://example.com')).toEqual({
			href: 'https://example.com',
			isExternal: true,
			kind: 'string',
		});
	});

	it('resolves a page permalink', () => {
		expect(resolveDirectusLink({ type: 'page', page: { permalink: '/our-story' } })).toEqual({
			href: '/our-story',
			isExternal: false,
			kind: 'page',
		});
	});

	it('resolves a post slug', () => {
		expect(resolveDirectusLink({ type: 'post', post: { slug: 'hello-world' } })).toEqual({
			href: '/blog/hello-world',
			isExternal: false,
			kind: 'post',
		});
	});

	it('resolves a URL type and detects external links', () => {
		expect(resolveDirectusLink({ type: 'url', url: '/support' })).toEqual({
			href: '/support',
			isExternal: false,
			kind: 'url',
		});
		expect(resolveDirectusLink({ type: 'url', url: 'https://example.com' })).toEqual({
			href: 'https://example.com',
			isExternal: true,
			kind: 'url',
		});
	});

	it('returns a submit kind with no href', () => {
		expect(resolveDirectusLink({ type: 'submit' })).toEqual({ href: null, isExternal: false, kind: 'submit' });
	});

	it('falls back to url when type is unknown/missing', () => {
		expect(resolveDirectusLink({ url: '/fallback' })).toEqual({
			href: '/fallback',
			isExternal: false,
			kind: 'url',
		});
	});
});
