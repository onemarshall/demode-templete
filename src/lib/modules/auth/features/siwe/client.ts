/**
 * SIWE Client Utilities
 *
 * Minimal client-side helpers for SIWE authentication.
 * Most functionality is handled by Better Auth's authClient.siwe methods.
 */

/**
 * Ethereum Provider Interface (EIP-1193)
 */
export interface EthereumProvider {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
	on?(event: string, listener: (...args: unknown[]) => void): void;
	removeListener?(event: string, listener: (...args: unknown[]) => void): void;
	isWalletConnect?: boolean;
}

/**
 * Generate a SIWE message for signing
 */
export function generateSIWEMessage(
	address: string,
	domain: string,
	nonce: string,
	statement: string = 'Sign in with Ethereum to the app.',
	chainId: number = 1
): string {
	const origin = typeof window !== 'undefined' ? window.location.origin : `https://${domain}`;

	return [
		`${domain} wants you to sign in with your Ethereum account:`,
		address,
		'',
		statement,
		'',
		`URI: ${origin}`,
		`Version: 1`,
		`Chain ID: ${chainId}`,
		`Nonce: ${nonce}`,
		`Issued At: ${new Date().toISOString()}`
	].join('\n');
}

/**
 * Check if an injected Ethereum provider exists
 */
export function hasEthereumProvider(): boolean {
	return typeof window !== 'undefined' && 'ethereum' in window;
}

/**
 * Get the injected Ethereum provider
 */
export function getEthereumProvider(): EthereumProvider | null {
	if (typeof window !== 'undefined' && 'ethereum' in window) {
		return (window as { ethereum: EthereumProvider }).ethereum;
	}
	return null;
}
