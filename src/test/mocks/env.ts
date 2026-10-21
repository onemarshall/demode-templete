const mockEnv = {
	BETTER_DATABASE_URL: 'postgres://test',
	BETTER_AUTH_SECRET: 'test-secret',
	PUBLIC_SITE_URL: 'http://localhost:3000',
	PUBLIC_APP_NAME: 'test-app',
	PUBLIC_ENV_MODE: 'test',
	PUBLIC_CAPTCHA_SITE_KEY: '',
	NODE_ENV: 'test'
};

export function getServerEnv() {
	return mockEnv;
}

export function getServerEnvSync() {
	return mockEnv;
}

export function getPublicEnv() {
	return mockEnv;
}

export function refreshPublicEnv() {
	return mockEnv;
}

export const publicEnv = mockEnv;

export function isBrowser() {
	return false;
}

export function isServer() {
	return true;
}

export function isDevelopment() {
	return false;
}

export function isProduction() {
	return false;
}

export function isStaging() {
	return false;
}

export function isAuthDebugMode() {
	return false;
}

export function clearEnvCache() {}
export function reloadEnv() {}
export function getDebugEnvInfo() {
	return {};
}
