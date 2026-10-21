/**
 * Social Provider Configuration Options
 *
 * Social authentication provider configuration.
 */

import { getServerEnv, type FullEnv } from '#lib/auth/shared/env/index.js';
import { logger } from '#lib/auth/shared/logger.js';

// In src/lib/server/auth/options/socials.ts
export async function getSocialProviders(envOverride?: FullEnv) {
	const env = envOverride ?? (await getServerEnv());

	if (env.AUTH_SOCIAL_LOGIN_ENABLED === false) {
		logger.info('Social login disabled via AUTH_SOCIAL_LOGIN_ENABLED');
		return {};
	}

	const providers: Record<string, unknown> = {};

	// Only add providers that have both client ID and secret
	if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
		providers.github = {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
			mapProfileToUser: (profile: Record<string, unknown>) => {
				const mappedUser = {
					name: profile.name as string,
					email: profile.email as string,
					image: profile.avatar_url as string,
					provider: 'github'
				};
				logger.success('GitHub user data loaded!');
				return mappedUser;
			}
		};
	}

	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			mapProfileToUser: (profile: Record<string, unknown>) => ({
				name: profile.name as string,
				email: profile.email as string,
				image: profile.picture as string,
				provider: 'google'
			})
		};
	}

	// Add other providers similarly...
	if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
		providers.linkedin = {
			clientId: env.LINKEDIN_CLIENT_ID,
			clientSecret: env.LINKEDIN_CLIENT_SECRET
		};
	}

	if (env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET) {
		providers.twitter = {
			clientId: env.TWITTER_CLIENT_ID,
			clientSecret: env.TWITTER_CLIENT_SECRET
		};
	}

	return providers;
}
