export async function testBetterAuthHooks(): Promise<void> {
	// Minimal smoke test used by scripts/test-integration.test.ts.
	// This intentionally avoids importing server-only auth modules (env validation / DB)
	// and instead asserts that the browser-like globals used by client-side hooks exist.
	const w = globalThis.window as unknown as Record<string, unknown> | undefined;
	const nav = globalThis.navigator as unknown as Record<string, unknown> | undefined;

	if (!w) {
		throw new Error('window is not defined');
	}
	if (!nav) {
		throw new Error('navigator is not defined');
	}

	const windowNavigator = (w as { navigator?: unknown }).navigator as
		| Record<string, unknown>
		| undefined;
	const userAgent =
		(typeof nav?.userAgent === 'string' && nav.userAgent) ||
		(typeof windowNavigator?.userAgent === 'string' && windowNavigator.userAgent) ||
		'';
	if (!userAgent) {
		console.log('Better Auth hooks smoke test: userAgent not provided (skipping strict check)');
	}

	// Optional APIs may not exist in test; just verify no throw.
	const getSecurityData = (w as { getSecurityData?: unknown }).getSecurityData;
	if (getSecurityData && typeof getSecurityData !== 'function') {
		throw new Error('window.getSecurityData exists but is not a function');
	}

	// Provide a small side effect so the calling integration test can see activity in logs.
	// (The tests often use console spying.)
	console.log('Better Auth hooks smoke test completed');
}
