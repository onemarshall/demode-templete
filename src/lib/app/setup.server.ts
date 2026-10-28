/** The host application owns the composition of otherwise independent modules. */
import { initializeAuth } from '#lib/modules/auth/server/config.js';
import { appAuthIntegrations } from './auth-policies.server';

import { getServerEnv } from '#lib/platform/config/server.server.js';
import { configureDatabase } from '#lib/platform/database/db.js';

const environment = await getServerEnv();
if (!environment.BETTER_DATABASE_URL) throw new Error('Auth database configuration required');
configureDatabase(environment.BETTER_DATABASE_URL);

export const auth = await initializeAuth(appAuthIntegrations);
