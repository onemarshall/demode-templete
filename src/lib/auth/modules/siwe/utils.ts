/**
 * SIWE Server Utilities
 * Nonce generation, signature verification, and ENS lookup
 */

import { generateRandomString } from 'better-auth/crypto';
import { logger } from '$lib/auth/shared/logger';

// Types
interface ENSResult {
	name: string;
	avatar: string;
}

interface SIWEEnv {
	AUTH_SIWE_ENABLED?: boolean;
	PUBLIC_AUTH_SIWE_PLUGIN?: boolean;
	SIWE_DOMAIN?: string;
	SIWE_EMAIL_DOMAIN?: string;
	SIWE_ANONYMOUS?: boolean;
	SIWE_RPC_URL?: string;
	SIWE_ENABLE_ENS_LOOKUP?: boolean;
}

// Cache viem imports
let viemModule: typeof import('viem') | null = null;
let viemChainsModule: typeof import('viem/chains') | null = null;

async function getViem() {
	if (!viemModule) {
		viemModule = await import('viem');
	}
	return viemModule;
}

async function getViemChains() {
	if (!viemChainsModule) {
		viemChainsModule = await import('viem/chains');
	}
	return viemChainsModule;
}

/**
 * Generate a cryptographically secure nonce
 */
export async function generateNonce(): Promise<string> {
	return generateRandomString(32);
}

/**
 * Verify a SIWE message signature
 */
export async function verifyMessage(
	message: string,
	signature: string,
	address: string
): Promise<boolean> {
	// Validate nonce exists
	const nonceMatch = message.match(/Nonce: ([^\n]+)/);
	if (!nonceMatch?.[1]) {
		logger.warn('SIWE message missing nonce');
		return false;
	}

	try {
		const viem = await getViem();

		const isValid = await viem.verifyMessage({
			address: address as `0x${string}`,
			message,
			signature: signature as `0x${string}`
		});

		if (!isValid) {
			logger.warn('SIWE signature invalid', {
				address: `${address.substring(0, 6)}...`
			});
		}

		return isValid;
	} catch (error) {
		logger.error('SIWE verification failed', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		// Fail closed - don't bypass verification
		return false;
	}
}

/**
 * Lookup ENS name and avatar
 */
export async function ensLookup(
	walletAddress: string,
	rpcUrl: string = 'https://eth.llamarpc.com',
	enableENS: boolean = true
): Promise<ENSResult> {
	const fallback = { name: walletAddress, avatar: '' };

	if (!enableENS) {
		return fallback;
	}

	try {
		const viem = await getViem();
		const chains = await getViemChains();

		const client = viem.createPublicClient({
			chain: chains.mainnet,
			transport: viem.http(rpcUrl)
		});

		const ensName = await client.getEnsName({
			address: walletAddress as `0x${string}`
		});

		if (!ensName) {
			return fallback;
		}

		let ensAvatar: string | null = null;
		try {
			ensAvatar = await client.getEnsAvatar({ name: ensName });
		} catch {
			// Avatar lookup optional
		}

		return {
			name: ensName,
			avatar: ensAvatar || ''
		};
	} catch {
		return fallback;
	}
}

/**
 * Validate SIWE configuration
 */
export function validateSIWEConfig(env: SIWEEnv): boolean {
	if (!(env.AUTH_SIWE_ENABLED ?? env.PUBLIC_AUTH_SIWE_PLUGIN)) {
		return false;
	}

	if (!env.SIWE_DOMAIN) {
		logger.warn('SIWE_DOMAIN not configured');
		return false;
	}

	return true;
}

/**
 * Get SIWE plugin configuration
 */
export function getSIWEConfig(env: SIWEEnv) {
	const rpcUrl = env.SIWE_RPC_URL || 'https://eth.llamarpc.com';
	const enableENS = env.SIWE_ENABLE_ENS_LOOKUP ?? true;

	return {
		domain: env.SIWE_DOMAIN || 'localhost',
		emailDomainName: env.SIWE_EMAIL_DOMAIN || env.SIWE_DOMAIN || 'localhost',
		anonymous: env.SIWE_ANONYMOUS ?? true,
		getNonce: generateNonce,
		verifyMessage: async (args: { message: string; signature: string; address: string }) => {
			return verifyMessage(args.message, args.signature, args.address);
		},
		ensLookup: (args: { walletAddress: string }) => {
			return ensLookup(args.walletAddress, rpcUrl, enableENS);
		}
	};
}
