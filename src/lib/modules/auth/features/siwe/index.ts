/**
 * SIWE (Sign-In with Ethereum) Module
 */

export { SIWEPlugin } from './plugin';
export {
	generateSIWEMessage,
	hasEthereumProvider,
	getEthereumProvider,
	type EthereumProvider
} from './client';
export { getSIWEConfig, generateNonce, verifyMessage, ensLookup } from './utils';
