/** The host application owns the composition of otherwise independent modules. */
import { initializeAuth } from '#lib/modules/auth/server/config.js';
import { appAuthIntegrations } from './auth-policies.server';

export const auth = await initializeAuth(appAuthIntegrations);
