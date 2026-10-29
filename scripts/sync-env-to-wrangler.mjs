import { readFileSync, writeFileSync } from 'node:fs';

const BASE_URL = process.argv[2];
if (!BASE_URL) { console.error('usage: node scripts/sync-env-to-wrangler.mjs <base-url>'); process.exit(1); }

const env = Object.fromEntries(
	readFileSync('.env', 'utf8')
		.split('\n')
		.filter((line) => line.trim() && !line.trim().startsWith('#'))
		.map((line) => {
			const i = line.indexOf('=');
			const key = line.slice(0, i).trim();
			let value = line.slice(i + 1).trim();
			value = value.replace(/(^["']|["']$)/g, '').replace(/\s+#.*$/, '').trim();
			return [key, value];
		})
		.filter(([k, v]) => k && v !== '')
);

// Schema defaults (env-schema.ts). Vars equal to their default are dropped —
// the app applies defaults itself, and Workers Free caps bindings at 64.
const DEFAULTS = {
	PUBLIC_ENV_MODE: 'development', PUBLIC_APP_NAME: 'Auth App',
	PUBLIC_AUTH_SESSION_TOKEN_EXPIRES_IN: '7d', PUBLIC_AUTH_EMAIL_VERIFICATION_EXPIRES_IN: '24h',
	PUBLIC_AUTH_PASSWORD_RESET_EXPIRES_IN: '1h', PUBLIC_AUTH_MAGIC_LINK_EXPIRES_IN: '1h',
	AUTH_MAGIC_LINK_EXPIRES_IN: '300', AUTH_EMAIL_OTP_EXPIRES_IN: '300',
	AUTH_EMAIL_OTP_LENGTH: '6', AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS: '3',
	AUTH_EMAIL_OTP_STORE_STRATEGY: 'plain', AUTH_2FA_TOTP_PERIOD: '30',
	AUTH_2FA_TOTP_DIGITS: '6', AUTH_2FA_OTP_PERIOD_MINUTES: '3',
	AUTH_2FA_ISSUER: 'Auth App', PUBLIC_AUTH_2FA_ISSUER: 'Auth App',
	AUTH_2FA_SKIP_VERIFICATION_ON_ENABLE: 'false', AUTH_MAGIC_LINK_DISABLE_SIGNUP: 'false',
	AUTH_EMAIL_OTP_OVERRIDE_VERIFICATION: 'false', AUTH_EMAIL_OTP_SEND_ON_SIGNUP: 'false',
	AUTH_EMAIL_OTP_DISABLE_SIGNUP: 'false', AUTH_ADMIN_DEFAULT_BAN_EXPIRES_IN: '3600',
	ENABLE_SECURITY_ANALYSIS: 'false',
	AUTH_ADMIN_DEFAULT_ROLE: 'user', AUTH_ADMIN_ROLES: 'admin',
	AUTH_ADMIN_DEFAULT_BAN_REASON: 'No reason', AUTH_ADMIN_IMPERSONATION_SESSION_DURATION: '3600',
	AUTH_RATE_LIMIT_WINDOW: '15m', AUTH_RATE_LIMIT_MAX: '5',
	PUBLIC_AUTH_MAX_SESSIONS: '5', SMTP_PORT: '587', SMTP_SECURE: 'false',
	REDIS_PORT: '6379', REDIS_DB: '0', REDIS_TLS: 'false',
	S3_REGION: 'us-east-1', PUBLIC_S3_REGION: 'us-east-1',
	SECURITY_ANALYTICS_STORE_PROVIDER: 'redis', SECURITY_ANALYTICS_REDIS_KEY_PREFIX: 'security:analytics:',
	SECURITY_ANALYTICS_REDIS_MAX_EVENTS: '10000', SECURITY_ANALYTICS_REDIS_NAME: 'SecurityAnalyticsEventStore',
	STORAGE_PROVIDER: 'local', STORAGE_UPLOAD_DIR: './uploads', PUBLIC_STORAGE_TYPE: 'local',
	EMAIL_PROVIDER: 'mock', EMAIL_FROM: 'noreply@example.com', EMAIL_FROM_NAME: 'Auth App',
	EMAIL_DEBUG: 'false', APP_LOGGER_DISABLED: 'false', AUTH_DEBUG_MODE: 'false',
	PUBLIC_AUTH_DEBUG_MODE: 'false', CAPTCHA: 'false', SIWE_ANONYMOUS: 'false',
	SIWE_ENABLE_ENS_LOOKUP: 'false', PG_KV_STORE: 'false',
	PUBLIC_AUTH_PASSKEY_ATTACHMENT: 'cross-platform', PUBLIC_AUTH_PASSKEY_RESIDENT_KEY: 'preferred',
	PUBLIC_AUTH_PASSKEY_USER_VERIFICATION: 'preferred',
	// Flags whose schema default is TRUE (drop when value is 'true')
	AUTH_LAST_LOGIN_METHOD_ENABLED: 'true', AUTH_RATE_LIMIT_ENABLED: 'true',
	AUTH_LAST_LOGIN_METHOD_STORE_DB: 'true', PUBLIC_AUTH_LAST_LOGIN_METHOD_PLUGIN: 'true',
	PUBLIC_AUTH_PASSWORD_RESET_ENABLED: 'true', PUBLIC_AUTH_ACCOUNT_MANAGEMENT_ENABLED: 'true',
	PUBLIC_AUTH_SESSION_MANAGEMENT_ENABLED: 'true'
};
const DEFAULT_TRUE_FLAGS = new Set(Object.entries(DEFAULTS).filter(([, v]) => v === 'true').map(([k]) => k));

const SECRET_EXACT = new Set([
	'BETTER_DATABASE_URL', 'BETTER_AUTH_SECRET', 'OAUTH_PROXY_SECRET',
	'REDIS_URL', 'REDIS_PASSWORD', 'BIGDATACLOUD_API_KEY',
	'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CAP_SECRET', 'SIWE_RPC_URL'
]);
const SECRET_RE = /(SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY|SMTP_PASS)/;
const NOT_SECRET = /(ENABLED$|EXPIRES_IN$)/;

const overrides = {
	PUBLIC_SITE_URL: BASE_URL,
	PUBLIC_BETTER_AUTH_URL: BASE_URL,
	PUBLIC_AUTH_CALLBACK_URL: BASE_URL,
	PUBLIC_ENV_MODE: 'production',
	CMS_PROVIDER: 'none'
};
const drops = new Set([
	'DIRECTUS_ADMIN_TOKEN', 'DIRECTUS_DEFAULT_ROLE_ID', 'DIRECTUS_WEBHOOK_SECRET',
	'PUBLIC_CMS_PROVIDER', 'PUBLIC_CMS_URL',
	'PUBLIC_AUTH_PASSKEY_RPID', 'PUBLIC_AUTH_PASSKEY_ORIGIN',
	'ADMIN_ROLES', 'GITHUB_CLIENT_ID', 'LOCAL_STORAGE_PATH', 'NODE_ENV',
	'PUBLIC_WALLETCONNECT_ID', 'S3_ENDPOINT', 'SIWE_DOMAIN', 'SIWE_EMAIL_DOMAIN',
	'CLOUDINARY_FOLDER', 'CMS_API_URL', 'AUTH_SOCIAL_LOGIN_ENABLED'
]);

const vars = {};
const secrets = [];
const flagRe = /(_ENABLED$|_PLUGIN$|_REQUIRED$)/;
for (const [key, value] of Object.entries(env)) {
	if (drops.has(key)) continue;
	if (SECRET_EXACT.has(key) || (SECRET_RE.test(key) && !NOT_SECRET.test(key))) { secrets.push(key); continue; }
	if (overrides[key]) { vars[key] = overrides[key]; continue; }
	if (flagRe.test(key)) {
		const defaultTrue = DEFAULT_TRUE_FLAGS.has(key);
		if ((defaultTrue && value === 'true') || (!defaultTrue && value === 'false')) continue;
		vars[key] = value; continue;
	}
	if (key in DEFAULTS && DEFAULTS[key] === value) continue;
	vars[key] = value;
}

const cfg = JSON.parse(readFileSync('wrangler.jsonc', 'utf8').replace(/,(\s*[}\]])/g, '$1'));
cfg.vars = Object.fromEntries(Object.entries(vars).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync('wrangler.jsonc', JSON.stringify(cfg, null, 2) + '\n');

console.log(`vars baked into wrangler.jsonc: ${Object.keys(cfg.vars).length} (+${secrets.length} secrets = ${Object.keys(cfg.vars).length + secrets.length} bindings, limit 64)`);
console.log(`secrets (${secrets.length}):`);
console.log(secrets.join('\n'));
writeFileSync('.wrangler-secrets.txt', secrets.join('\n') + '\n');
