/**
 * Content Security Policy Configuration
 *
 * This configuration uses environment variables for flexibility:
 * - VITE_DOMAIN: The root domain for your application
 * - DIRECTUS_URL: The URL for Directus assets (defaults to http://localhost:8061)
 */

// Environment variables
const rootUrl = process.env.PUBLIC_SITE_URL;
const rootOrigin = rootUrl ? new URL(rootUrl).origin : undefined;
const rootWSOrigin = rootUrl
  ? `${rootUrl.startsWith("https") ? "wss" : "ws"}://${new URL(rootUrl).host}`
  : undefined;
const directusUrl = process.env.PUBLIC_DIRECTUS_URL || "http://localhost:8061";
const isDev = process.env.NODE_ENV === "development";

// Common domains
const domains = {
  cloudfront: "https://*.cloudfront.net",
  app: "https://oae.austinmarshall.co.uk",
  jsdelivr: "https://*.jsdelivr.net",
  googleApis: "https://*.googleapis.com",
  cloudflare: "https://*.cloudflare.com",
  unpkg: "https://unpkg.com",
  fonts: "https://fonts.gstatic.com",
  fontsGoogle: "https://fonts.googleapis.com",
  twitter: "https://platform.twitter.com",
  walletConnect: "https://*.walletconnect.org",
  web3Modal: "https://*.web3modal.org",
  host: "https://*.iamstudios.cc",
  bigDataCloud: "https://api.bigdatacloud.net",
  youtube: "https://www.youtube-nocookie.com",
  vimeo: "https://player.vimeo.com",
};

export function createSecurityHeaders({ corsOrigin }) {
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Credentials": "true",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
  };
}

/**
 * Creates CSP directives with support for nonces
 * @param {{
 *   nonce?: string,
 *   isDev?: boolean
 * }} options - Options for CSP directives
 * @returns {Record<string, string>} CSP directives
 */
export function CSPDirectives({ nonce = "", isDev: isDevOverride } = {}) {
  const isDevelopment = typeof isDevOverride === "boolean" ? isDevOverride : isDev;
  // Common sources that can be reused
  const self = ["'self'"];
  const localhost = isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : [];
  const data = ["data:"];
  const https = ["https:"];
  const unsafeInline = ["'unsafe-inline'"];

  // Script sources
  const scriptSrc = [
    ...self,
    ...localhost,
    domains.host,
    domains.jsdelivr, // Allow CDN scripts (e.g., Cap.js widget)
    domains.unpkg, // Allow unpkg.com for Cap.js widget
    domains.walletConnect,
    domains.web3Modal,
    domains.bigDataCloud,
    ...(nonce ? [`'nonce-${nonce}'`] : isDevelopment ? unsafeInline : []),
    ...(isDevelopment ? ["'unsafe-eval'", "'wasm-unsafe-eval'"] : ["'wasm-unsafe-eval'"]),
  ];

  // Style sources
  const styleSources = [
    ...self,
    ...localhost,
    ...https,
    domains.jsdelivr,
    domains.googleApis,
    domains.fontsGoogle,
    ...unsafeInline, // Svelte needs this for dynamic styles
  ];

  // Default sources
  const defaultSrc = [
    ...self,
    ...(rootOrigin ? [rootOrigin, rootWSOrigin].filter(Boolean) : []),
    domains.unpkg,
    domains.googleApis,
    directusUrl,
    ...localhost,
  ];

  return {
    // Default restrictions for web content
    "default-src": defaultSrc,

    // Restrict base element URLs
    "base-uri": self,

    // Restrict nested browsing contexts
    "child-src": [...self, "blob:"],

    // Network connections
    "connect-src": [
      ...self,
      ...localhost,
      "https:",
      "wss:",
      "blob:",
      "data:",
      domains.cloudfront,
      domains.bigDataCloud,
      domains.walletConnect,
      domains.web3Modal,
    ],

    // Font loading
    "font-src": [...self, ...data, ...https, domains.fonts, domains.fontsGoogle],

    // Form submission targets
    "form-action": self,

    // Frame embedding
    "frame-ancestors": self,
    "frame-src": [
      ...self,
      domains.twitter,
      domains.youtube,
      domains.vimeo,
      "blob:",
      domains.walletConnect,
    ],

    // Image sources
    "img-src": [...self, directusUrl, "http://localhost:*", ...data, ...https, "blob:"],

    // Media sources (audio, video)
    "media-src": [...self, directusUrl, "http://localhost:*", ...data, ...https, "blob:"],

    // Object/embed/plugin sources
    "object-src": ["'none'"],

    // JavaScript sources
    "script-src": scriptSrc,
    "script-src-attr": isDevelopment ? [...unsafeInline] : ["'none'"],

    // CSS sources
    "style-src": styleSources,
    "style-src-attr": [...unsafeInline],
    "style-src-elem": styleSources,

    // Web Worker sources
    "worker-src": [...self, "blob:"],

    // SvelteKit specific
    "manifest-src": self,
  };
}
