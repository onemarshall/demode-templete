/**
 * Bun CIMD transport.
 *
 * Secure HTTPS transport for `@better-auth/cimd` metadata fetches that
 * satisfies the CIMD security-boundary contract (see
 * better-auth.com/docs/plugins/cimd#security-boundary):
 * - parses the target as an HTTPS URL before resolving it
 * - resolves the hostname once and rejects every RFC 6890 special-use result
 * - connects to the approved address while preserving TLS SNI and certificate
 *   verification for the original hostname
 * - refuses redirects and honors the supplied method, headers, and abort signal
 *
 * This is the Bun equivalent of `@better-auth/cimd/node`. Bun's `fetch`
 * accepts a `tls.serverName` override, so the pinned IP can be used as the
 * connection target while the certificate is still verified against the
 * original hostname.
 */

import { isPublicRoutableHost } from '@better-auth/core/utils/host';
import type { ClientMetadataResourceFetch } from '@better-auth/oauth-provider';

function formatPinnedHost(address: string): string {
	// IPv6 addresses must be bracketed in URLs
	return address.includes(':') ? `[${address}]` : address;
}

export const fetchClientMetadataResource: ClientMetadataResourceFetch = async (input, init) => {
	const webRequest = new Request(input, init);
	const url = new URL(webRequest.url);

	if (url.protocol !== 'https:') {
		throw new TypeError('CIMD Bun transport requires an HTTPS URL');
	}
	if (webRequest.method !== 'GET' && webRequest.method !== 'HEAD') {
		throw new TypeError('CIMD Bun transport supports only GET and HEAD');
	}

	const addresses = await Bun.dns.lookup(url.hostname);
	for (const { address } of addresses) {
		if (!isPublicRoutableHost(address)) {
			throw new TypeError('metadata hostname must resolve only to public-routable addresses');
		}
	}

	const pinnedAddress = addresses[0];
	if (!pinnedAddress) {
		throw new TypeError('metadata hostname returned no DNS addresses');
	}
	const headers = new Headers(webRequest.headers);
	headers.set('host', url.host);

	// `redirect: 'manual'` surfaces 3xx responses to the caller instead of
	// following them, which is the required "refuse redirects" behavior.
	return fetch(`https://${formatPinnedHost(pinnedAddress.address)}${url.pathname}${url.search}`, {
		method: webRequest.method,
		headers,
		redirect: 'manual',
		signal: webRequest.signal,
		tls: {
			serverName: url.hostname,
			rejectUnauthorized: true
		}
	});
};
