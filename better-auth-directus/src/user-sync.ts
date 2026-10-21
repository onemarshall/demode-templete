/**
 * Directus User Sync Service
 * Manages synchronization between Better Auth users and Directus CMS
 */

import {
	uploadFiles,
	deleteItem,
	readUsers,
	createUser,
	updateUser as updateUserDirectus
} from '@directus/sdk';
import type { RestClient } from '@directus/sdk';
import { z } from 'zod';
import type { DirectusSyncUser, BetterAuthUserInput, SyncLogger } from './types';
import type { DirectusSyncSchema } from './schema';
import { DirectusBoundary } from './boundary';

const noopLogger: SyncLogger = {
	info() {},
	warn() {},
	error() {},
	debug() {}
};

const DETAILED_USER_FIELDS = [
	'*',
	{ role: ['*'] },
	{
		avatar: ['*', { uploaded_by: ['*'] }]
	},
	{ policies: ['*'] }
] as const;

const betterAuthUserInputSchema = z.object({
	id: z.string().trim().min(1),
	email: z.email().trim(),
	name: z.string().trim().min(1).nullable().optional(),
	image: z
		.string()
		.trim()
		// Better Auth user.image isn't guaranteed to be a URL — legacy rows may
		// hold empty strings or Directus file UUIDs. The field is never written
		// to Directus, so normalize anything non-URL to null.
		.transform((value) => {
			if (!value) return null;
			try {
				return new URL(value).toString();
			} catch {
				return null;
			}
		})
		.nullable()
		.optional()
});

const paginationOptionsSchema = z.object({
	limit: z.number().int().min(0).max(500).optional(),
	offset: z.number().int().min(0).optional()
});

function splitDisplayName(name?: string | null): {
	first_name: string;
	last_name: string;
} {
	const normalized = name?.trim() ?? '';
	if (!normalized) {
		return {
			first_name: '',
			last_name: ''
		};
	}

	const parts = normalized.split(/\s+/);

	return {
		first_name: parts[0] ?? '',
		last_name: parts.slice(1).join(' ')
	};
}

export class DirectusUserService {
	private client: RestClient<DirectusSyncSchema>;
	private config: { url: string; defaultRoleId?: string };
	private boundary: DirectusBoundary;
	private logger: SyncLogger;

	constructor(
		client: RestClient<DirectusSyncSchema>,
		config: { url: string; defaultRoleId?: string },
		boundary?: DirectusBoundary,
		logger?: SyncLogger
	) {
		this.client = client;
		this.config = config;
		this.boundary = boundary ?? new DirectusBoundary();
		this.logger = logger ?? noopLogger;
	}

	private isUuid(id: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
	}

	private async findUserByField(
		filter: Record<string, unknown>,
		context: { userId?: string; email?: string }
	): Promise<DirectusSyncUser | null> {
		try {
			const users = await this.client.request(
				readUsers({
					filter,
					limit: 1,
					fields: DETAILED_USER_FIELDS
				})
			);

			if (!users || users.length === 0) {
				return null;
			}

			return users[0] as DirectusSyncUser;
		} catch (error) {
			const detail =
				error instanceof Error
					? error.message
					: typeof error === 'object'
						? JSON.stringify(error, null, 2)
						: String(error);
			this.logger.error('Failed to query Directus user', {
				error: detail,
				...context
			});
			throw error;
		}
	}

	private parseBetterAuthUser(input: BetterAuthUserInput): BetterAuthUserInput {
		return betterAuthUserInputSchema.parse(input);
	}

	async getDetailedUser(userId: string): Promise<DirectusSyncUser | null> {
		return await this.boundary.run({
			operation: 'DirectusUserService.getDetailedUser',
			fallback: null,
			op: async () => {
				try {
					const directusById = this.isUuid(userId)
						? await this.findUserByField({ id: { _eq: userId } }, { userId })
						: null;

					if (directusById) {
						return directusById;
					}

					const directusByExternalIdentifier = await this.findUserByField(
						{ external_identifier: { _eq: userId } },
						{ userId }
					);

					if (directusByExternalIdentifier) {
						return directusByExternalIdentifier;
					}

					this.logger.warn('User not found in Directus', { userId });
					return null;
				} catch (error) {
					const detail =
						error instanceof Error
							? error.message
							: typeof error === 'object'
								? JSON.stringify(error, null, 2)
								: String(error);
					this.logger.error('Failed to get detailed user from Directus', {
						error: detail,
						userId
					});
					throw error;
				}
			}
		});
	}

	async syncUser(betterAuthUser: BetterAuthUserInput): Promise<DirectusSyncUser | null> {
		return await this.boundary.run({
			operation: 'DirectusUserService.syncUser',
			fallback: null,
			op: async () => {
				try {
					const parsedUser = this.parseBetterAuthUser(betterAuthUser);
					const existingUser = await this.findUser({
						id: parsedUser.id,
						email: parsedUser.email
					});

					if (existingUser) {
						const updatedUser = await this.updateUser(existingUser.id, parsedUser);
						this.logger.info('User updated in Directus', {
							userId: updatedUser.id,
							email: parsedUser.email
						});
						return updatedUser;
					}

					const newUser = await this.createUser(parsedUser);
					this.logger.info('User created in Directus', {
						userId: newUser.id,
						email: parsedUser.email
					});
					return newUser;
				} catch (error) {
					this.logger.error('Failed to sync user to Directus', {
						error: error instanceof Error ? error.message : String(error),
						email: betterAuthUser.email
					});
					throw error;
				}
			}
		});
	}

	async findUser(criteria: { email?: string; id?: string }): Promise<DirectusSyncUser | null> {
		if (criteria.id) {
			const byId = await this.getDetailedUser(criteria.id);
			if (byId) {
				return byId;
			}
		}
		if (criteria.email) {
			return this.findUserByEmail(criteria.email);
		}
		return null;
	}

	private async findUserByEmail(email: string): Promise<DirectusSyncUser | null> {
		return this.findUserByField({ email: { _eq: email } }, { email });
	}

	private async createUser(betterAuthUser: BetterAuthUserInput): Promise<DirectusSyncUser> {
		const { first_name, last_name } = splitDisplayName(betterAuthUser.name);
		const userData = {
			email: betterAuthUser.email,
			first_name,
			last_name,
			external_identifier: betterAuthUser.id,
			role: this.config.defaultRoleId || null,
			status: 'active' as const
		};

		const createdUser = await this.client.request(createUser(userData));
		return createdUser as DirectusSyncUser;
	}

	private async updateUser(
		userId: string,
		betterAuthUser: BetterAuthUserInput
	): Promise<DirectusSyncUser> {
		const { first_name, last_name } = splitDisplayName(betterAuthUser.name);
		const updateData = {
			email: betterAuthUser.email,
			first_name,
			last_name,
			external_identifier: betterAuthUser.id
		};

		const updatedUser = await this.client.request(updateUserDirectus(userId, updateData));
		return updatedUser as DirectusSyncUser;
	}

	async uploadAvatar(userId: string, avatarFile: File): Promise<string | null> {
		return await this.boundary.run({
			operation: 'DirectusUserService.uploadAvatar',
			fallback: null,
			op: async () => {
				try {
					const formData = new FormData();
					formData.append('file', avatarFile);

					const uploadedFile = await this.client.request(uploadFiles(formData));

					if (!uploadedFile || !uploadedFile.id) {
						throw new Error('File upload failed');
					}

					await this.client.request(
						updateUserDirectus(userId, {
							avatar: uploadedFile.id
						})
					);

					this.logger.info('Avatar uploaded for user', { userId, fileId: uploadedFile.id });
					return uploadedFile.id as string;
				} catch (error) {
					this.logger.error('Failed to upload avatar for user', {
						error: error instanceof Error ? error.message : String(error),
						userId
					});
					throw error;
				}
			}
		});
	}

	async removeAvatar(userId: string): Promise<void> {
		await this.boundary.run({
			operation: 'DirectusUserService.removeAvatar',
			fallback: undefined,
			op: async () => {
				try {
					const users = await this.client.request(
						readUsers({
							filter: { id: { _eq: userId } },
							limit: 1,
							fields: ['avatar']
						})
					);

					if (!users || users.length === 0 || !users[0]?.avatar) {
						this.logger.info('No avatar to remove for user', { userId });
						return;
					}

					const avatarId = users[0].avatar as string;

					await this.client.request(
						updateUserDirectus(userId, {
							avatar: null
						})
					);

					try {
						await this.client.request(deleteItem('directus_files', avatarId));
						this.logger.info('Avatar file deleted', { userId, fileId: avatarId });
					} catch (deleteError) {
						this.logger.warn('Failed to delete avatar file, but user reference cleared', {
							userId,
							fileId: avatarId,
							error: deleteError instanceof Error ? deleteError.message : String(deleteError)
						});
					}

					this.logger.info('Avatar removed for user', { userId });
				} catch (error) {
					this.logger.error('Failed to remove avatar for user', {
						error: error instanceof Error ? error.message : String(error),
						userId
					});
					throw error;
				}
			}
		});
	}

	async getUsers(options: { limit?: number; offset?: number } = {}): Promise<DirectusSyncUser[]> {
		return await this.boundary.run({
			operation: 'DirectusUserService.getUsers',
			fallback: [],
			op: async () => {
				try {
					const parsedOptions = paginationOptionsSchema.parse(options);
					const fields = [
						'id',
						'email',
						'first_name',
						'last_name',
						'role',
						'status',
						'date_created'
					] as const;
					const query = {
						limit: parsedOptions.limit ?? 100,
						offset: parsedOptions.offset ?? 0,
						fields
					};

					const users = await this.client.request(readUsers(query));

					return users as DirectusSyncUser[];
				} catch (error) {
					this.logger.error('Failed to get users from Directus', {
						error: error instanceof Error ? error.message : String(error)
					});
					throw error;
				}
			}
		});
	}
}
