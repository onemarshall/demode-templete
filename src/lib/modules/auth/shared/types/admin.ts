import { z } from 'zod';

export const banUserSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	banReason: z.string().optional(),
	banExpiresIn: z.number().optional()
});

export const userIdSchema = z.object({
	userId: z.string().min(1, 'User ID is required')
});

export const setRoleSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	role: z.string().min(1, 'Role is required')
});

export const setPasswordSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

export const revokeSessionSchema = z.object({
	sessionToken: z.string().min(1, 'Session token is required')
});
