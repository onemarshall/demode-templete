/**
 * Server Plugins
 */

// Core Better Auth plugins
export { buildCorePlugins } from './core';

// Security plugins
export { buildSecurityPlugins } from './security';

// CMS integration
export { buildCMSPlugin, getCMSProvider, getDirectusCMSProvider, getDirectusPlugin } from './cms';

// Plugin aggregation
export { buildPlugins, buildSyncPlugins } from './aggregator';
