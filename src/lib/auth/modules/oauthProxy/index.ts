/**
 * OAuth Proxy Module
 *
 * Proxies OAuth flows through the production server for dev/preview
 * environments whose callback URLs can't be registered with providers.
 */

export { OAuthProxyPlugin } from './plugin';
