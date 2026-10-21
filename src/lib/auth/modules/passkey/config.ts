/**
 * Passkey Configuration Resolution
 *
 * Pure helpers that turn the raw environment into the WebAuthn values the
 * better-auth passkey plugin needs.
 *
 * WebAuthn requires the relying party ID (RP ID) to be a registrable domain
 * suffix of, or equal to, the effective domain of the origin the browser is
 * served from. A mismatched RP ID makes the browser reject the ceremony with
 * `SecurityError` (surfaced by simplewebauthn as `ERROR_INVALID_RP_ID`),
 * which better-auth then reports as a generic "Auth cancelled".
 *
 * The helpers below keep the RP ID and the allowed origins in sync and report
 * the problems that would otherwise only surface in the browser.
 */

export interface PasskeyConfigInput {
	/** Explicitly configured relying party ID. */
	rpID?: string;
	/** Explicitly configured origin(s). Comma separated values are allowed. */
	origin?: string;
	/** Canonical public site URL, used to derive the RP ID when none is set. */
	siteUrl?: string;
	/** Canonical auth API URL, used to derive the RP ID when none is set. */
	betterAuthUrl?: string;
}

export interface PasskeyConfig {
	/** Relying party ID sent to the browser. */
	rpID: string;
	/**
	 * Origins the ceremony may be performed on.
	 * `null` means "use the origin of the incoming request", which keeps local
	 * development working on arbitrary ports.
	 */
	origins: string[] | null;
	/** Configuration problems that will break the ceremony in the browser. */
	warnings: string[];
}

/**
 * Hosts that WebAuthn treats as local development origins. The browser only
 * accepts `localhost` as the relying party ID for these.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/**
 * Extract the hostname of a URL, or `undefined` when the value is unusable.
 */
function hostOf(url: string | undefined): string | undefined {
	if (!url) return undefined;

	try {
		return new URL(url).hostname;
	} catch {
		return undefined;
	}
}

/**
 * Split a comma separated list of origins into a normalized array.
 */
function parseOrigins(value: string | undefined): string[] | null {
	if (!value) return null;

	const origins = value
		.split(',')
		.map((origin) => origin.trim().replace(/\/+$/, ''))
		.filter(Boolean);

	return origins.length > 0 ? origins : null;
}

/**
 * Check whether a relying party ID may be used on a given host.
 *
 * Mirrors the browser rule: the RP ID has to be the host itself or a
 * registrable domain suffix of it. Local development hosts additionally accept
 * `localhost`.
 */
export function isRpIdValidForHost(rpID: string, host: string): boolean {
	if (!rpID || !host) return false;
	if (rpID === host) return true;

	if (LOCAL_HOSTS.has(host)) {
		return rpID === 'localhost';
	}

	// A registrable domain suffix, e.g. "iamstudios.cc" for
	// "auth.iamstudios.cc". The host must sit below the relying party.
	return host.endsWith(`.${rpID}`);
}

/**
 * Resolve the effective passkey configuration.
 *
 * The relying party ID falls back to the host of the canonical site URL so a
 * missing variable can never silently degrade to the `localhost` default and
 * break every deployed environment.
 */
export function resolvePasskeyConfig(input: PasskeyConfigInput): PasskeyConfig {
	const canonicalHost =
		hostOf(input.betterAuthUrl) ?? hostOf(input.siteUrl) ?? undefined;

	const configuredRpID = input.rpID?.trim();
	const rpID = configuredRpID || canonicalHost || 'localhost';

	const origins = parseOrigins(input.origin);
	const warnings: string[] = [];

	if (rpID === 'localhost' && canonicalHost && !LOCAL_HOSTS.has(canonicalHost)) {
		warnings.push(
			`The relying party ID "${rpID}" is invalid for the deployed origin "${canonicalHost}". ` +
				`Set PUBLIC_AUTH_PASSKEY_RPID to "${canonicalHost}" or a registrable domain suffix of it.`,
		);
	}

	if (origins) {
		for (const origin of origins) {
			const host = hostOf(origin);
			if (!host) {
				warnings.push(`"${origin}" is not a valid origin URL.`);
				continue;
			}

			if (!isRpIdValidForHost(rpID, host)) {
				warnings.push(
					`The relying party ID "${rpID}" is not valid for the origin "${origin}". ` +
						`The browser will reject the passkey ceremony with ERROR_INVALID_RP_ID.`,
				);
			}
		}
	}

	return { rpID, origins, warnings };
}
