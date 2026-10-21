// src/lib/components/auth/social-providers.ts
export const SOCIAL_PROVIDERS = {
	github: {
		id: 'github',
		name: 'GitHub',
		envId: 'GITHUB_CLIENT_ID',
		envSecret: 'GITHUB_CLIENT_SECRET',
		enabled: true
	},
	google: {
		id: 'google',
		name: 'Google',
		envId: 'GOOGLE_CLIENT_ID',
		envSecret: 'GOOGLE_CLIENT_SECRET',
		enabled: true
	},
	linkedin: {
		id: 'linkedin',
		name: 'LinkedIn',
		envId: 'LINKEDIN_CLIENT_ID',
		envSecret: 'LINKEDIN_CLIENT_SECRET',
		enabled: true
	},
	twitter: {
		id: 'twitter',
		name: 'X',
		envId: 'TWITTER_CLIENT_ID',
		envSecret: 'TWITTER_CLIENT_SECRET',
		enabled: true
	}
} as const;

export type ProviderId = keyof typeof SOCIAL_PROVIDERS;

export interface SocialProviderConfig {
	id: ProviderId;
	name: string;
	envId: string;
	envSecret: string;
	enabled: boolean;
}

export const SOCIAL_PROVIDERS_CONFIG: Record<ProviderId, SocialProviderConfig> = SOCIAL_PROVIDERS;

// Add the missing function
export function getEnabledProviders(
	env: Record<string, string | undefined>
): SocialProviderConfig[] {
	return Object.values(SOCIAL_PROVIDERS_CONFIG).filter((provider) => {
		// Check if both client ID and secret are available in environment
		const hasClientId = env[provider.envId];
		const hasClientSecret = env[provider.envSecret];

		return provider.enabled && hasClientId && hasClientSecret;
	});
}
