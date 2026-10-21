/**
 * DirectusSyncClient — Main orchestrator for Better Auth ↔ Directus sync.
 * Created via createDirectusSync() factory.
 */

import {
	createDirectus,
	rest,
	authentication,
	readUsers,
	updateUser as updateUserDirectus
} from '@directus/sdk';
import type { RestClient } from '@directus/sdk';
import Queue from 'p-queue';
import { z } from 'zod';

import type {
	DirectusSyncConfig,
	DirectusSyncUser,
	DirectusSyncFile,
	BetterAuthUserInput,
	SyncLogger,
	DirectusWebhookPayload
} from './types';
import type { DirectusSyncSchema } from './schema';
import { DirectusBoundary } from './boundary';
import { DirectusUserService } from './user-sync';
import { DirectusFileManager } from './file-manager';

const noopLogger: SyncLogger = {
	info() {},
	warn() {},
	error() {},
	debug() {}
};

const directusSyncConfigSchema = z.object({
	directusUrl: z.url(),
	directusToken: z.string().trim().min(1),
	defaultRoleId: z.string().trim().min(1).optional(),
	logger: z
		.object({
			info: z.function({ input: [z.string(), z.unknown().optional()], output: z.void() }),
			warn: z.function({ input: [z.string(), z.unknown().optional()], output: z.void() }),
			error: z.function({ input: [z.string(), z.unknown().optional()], output: z.void() }),
			debug: z
				.function({ input: [z.string(), z.unknown().optional()], output: z.void() })
				.optional()
		})
		.optional(),
	boundary: z
		.object({
			requestTimeoutMs: z.number().int().positive().optional(),
			openCircuitAfterFailures: z.number().int().positive().optional(),
			cooldownMsTransient: z.number().int().nonnegative().optional(),
			cooldownMsAuth: z.number().int().nonnegative().optional(),
			cooldownMsForbidden: z.number().int().nonnegative().optional(),
			logIntervalMs: z.number().int().nonnegative().optional()
		})
		.optional(),
	rateLimit: z
		.object({
			intervalCap: z.number().int().positive(),
			interval: z.number().int().positive()
		})
		.optional(),
	onUserUpdatedFromDirectus: z.function({ input: [z.unknown()], output: z.promise(z.void()) }).optional()
});

const directusWebhookPayloadSchema = z.object({
	event: z.string().trim().min(1),
	collection: z.string().trim().min(1),
	key: z.string().trim().min(1).optional(),
	keys: z.array(z.string().trim().min(1)).optional(),
	payload: z.record(z.string(), z.unknown()).optional()
});

export class DirectusSyncClient {
	private readonly config: DirectusSyncConfig;
	private readonly client: RestClient<DirectusSyncSchema>;
	private readonly logger: SyncLogger;
	private readonly boundary: DirectusBoundary;
	private readonly queue: Queue;
	private readonly userService: DirectusUserService;
	private readonly fileManager: DirectusFileManager;

	constructor(config: DirectusSyncConfig) {
		const parsedConfig = directusSyncConfigSchema.parse(config);
		this.config = parsedConfig;
		this.logger = parsedConfig.logger ?? noopLogger;

		// Create Directus client
		this.client = createDirectus<DirectusSyncSchema>(parsedConfig.directusUrl)
			.with(rest())
			.with(authentication('json')) as RestClient<DirectusSyncSchema>;

		// Set token
		if (parsedConfig.directusToken) {
			(this.client as unknown as { setToken: (token: string) => void }).setToken(
				parsedConfig.directusToken
			);
		}

		// Initialize boundary
		this.boundary = new DirectusBoundary(parsedConfig.boundary, this.logger);

		// Initialize rate limiting queue
		const rateConfig = parsedConfig.rateLimit ?? { intervalCap: 10, interval: 1000 };
		this.queue = new Queue({
			intervalCap: rateConfig.intervalCap,
			interval: rateConfig.interval,
			carryoverConcurrencyCount: true
		});

		// Initialize services
		this.userService = new DirectusUserService(
			this.client,
			{ url: parsedConfig.directusUrl, defaultRoleId: parsedConfig.defaultRoleId },
			this.boundary,
			this.logger
		);

		this.fileManager = new DirectusFileManager(
			this.client,
			{ url: parsedConfig.directusUrl },
			this.boundary,
			this.logger
		);

		this.logger.debug?.('DirectusSyncClient initialized', {
			url: parsedConfig.directusUrl,
			hasToken: Boolean(parsedConfig.directusToken),
			defaultRoleId: parsedConfig.defaultRoleId
		});
	}

	// === Forward Sync: Better Auth → Directus ===

	async syncUser(betterAuthUser: BetterAuthUserInput): Promise<DirectusSyncUser | null> {
		return this.userService.syncUser(betterAuthUser);
	}

	async getUser(userId: string): Promise<DirectusSyncUser | null> {
		return this.userService.getDetailedUser(userId);
	}

	async findUser(criteria: { email?: string; id?: string }): Promise<DirectusSyncUser | null> {
		return this.userService.findUser(criteria);
	}

	async deleteUser(userId: string): Promise<void> {
		// Clear avatar first, then we'd need to delete the user
		// Directus doesn't expose deleteUser in the SDK for system users,
		// so we set status to 'suspended' as a soft delete
		return await this.boundary.run({
			operation: 'DirectusSyncClient.deleteUser',
			fallback: undefined,
			op: async () => {
				try {
					await this.client.request(
						updateUserDirectus(userId, { status: 'suspended' })
					);
					this.logger.info('User suspended in Directus', { userId });
				} catch (error) {
					this.logger.error('Failed to delete/suspend user', { userId, error });
					throw error;
				}
			}
		});
	}

	// === Avatar Management ===

	async uploadAvatar(userId: string, file: File): Promise<string | null> {
		return this.userService.uploadAvatar(userId, file);
	}

	async removeAvatar(userId: string): Promise<void> {
		return this.userService.removeAvatar(userId);
	}

	// === File Operations ===

	async uploadFile(file: File, folder?: string): Promise<DirectusSyncFile> {
		return this.fileManager.uploadFile(file, folder);
	}

	async deleteFile(fileId: string): Promise<void> {
		return this.fileManager.deleteFile(fileId);
	}

	async getFile(fileId: string): Promise<DirectusSyncFile | null> {
		return this.fileManager.getFile(fileId);
	}

	// === Reverse Sync: Directus → Better Auth ===

	async handleDirectusWebhook(payload: DirectusWebhookPayload): Promise<void> {
		const parsedPayload = directusWebhookPayloadSchema.parse(payload);

		if (parsedPayload.collection !== 'directus_users') {
			this.logger.debug?.('Ignoring webhook for non-user collection', {
				collection: parsedPayload.collection
			});
			return;
		}

		if (!this.config.onUserUpdatedFromDirectus) {
			this.logger.warn('Received Directus webhook but no onUserUpdatedFromDirectus callback configured');
			return;
		}

		const userId = parsedPayload.key || parsedPayload.keys?.[0];
		if (!userId) {
			this.logger.warn('Webhook payload missing user key', { payload: parsedPayload });
			return;
		}

		const directusUser = await this.getUser(userId);
		if (!directusUser) {
			this.logger.warn('Could not find Directus user from webhook', { userId });
			return;
		}

		const userData = this.mapDirectusUserToBetterAuth(directusUser);
		await this.config.onUserUpdatedFromDirectus(userData);

		this.logger.info('Reverse sync completed from Directus webhook', { userId });
	}

	async pullUser(directusUserId: string): Promise<BetterAuthUserInput | null> {
		const directusUser = await this.getUser(directusUserId);
		if (!directusUser) return null;
		return this.mapDirectusUserToBetterAuth(directusUser);
	}

	private mapDirectusUserToBetterAuth(user: DirectusSyncUser): BetterAuthUserInput {
		const firstName = user.first_name || '';
		const lastName = user.last_name || '';
		const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : null;

		return {
			id: user.external_identifier || user.id,
			email: user.email,
			name,
			image: user.avatar ? this.getAssetUrl(user.avatar) : null
		};
	}

	// === Utilities ===

	async healthCheck(): Promise<boolean> {
		return await this.boundary.run({
			operation: 'DirectusSyncClient.healthCheck',
			fallback: false,
			op: async () => {
				try {
					await this.client.request(readUsers({ limit: 1 }));
					return true;
				} catch (error) {
					this.logger.error('Health check failed', { error });
					throw error;
				}
			}
		});
	}

	getAssetUrl(fileId: string | { id: string }): string {
		const id = typeof fileId === 'string' ? fileId : fileId.id;
		return `${this.config.directusUrl}/assets/${id}`;
	}

	async destroy(): Promise<void> {
		this.logger.info('Destroying DirectusSyncClient');
		await this.queue.onIdle();
	}

	/**
	 * Execute an operation through the rate limiting queue
	 */
	async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
		const result = await this.queue.add(operation);
		return result as T;
	}
}

/**
 * Factory function to create a configured DirectusSyncClient
 */
export function createDirectusSync(config: DirectusSyncConfig): DirectusSyncClient {
	return new DirectusSyncClient(config);
}
