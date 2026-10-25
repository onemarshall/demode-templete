// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User as BetterAuthUser } from 'better-auth';
import type { FraudAnalysis } from '#lib/modules/auth/security/types.js';
import type { SerializedSession, SerializedUser } from '#lib/modules/auth/shared/types/serialized-auth.js';

// Global type declarations for the application
declare global {
	const __SVELTEKIT_FORK_PRELOADS__: boolean;

	namespace App {
		interface User extends BetterAuthUser {
			hasPassword: boolean;
			// Override date fields to always be Date objects
			createdAt: Date;
			updatedAt: Date;
			lastLoginAt?: Date | null;
		}
		interface Error {
			message?: string;
			code?: string;
			requireCaptcha?: boolean;
			securityLevel?: 'low' | 'medium' | 'high';
		}
		interface CapSolveEventDetail {
			token: string;
		}
		interface CapInstance {
			solve(challenge: unknown): void;
			addEventListener(
				type: 'solve' | 'error',
				listener: (e: CustomEvent<CapSolveEventDetail | { error: string }>) => void
			): void;
		}
		interface CapOptions {
			apiEndpoint: string;
			invisible?: boolean;
			workers?: number;
			// add more options from Cap.js docs if available
		}

		interface Locals {
			cspNonce?: string;
			user?: SerializedUser | null;
			auth?: {
				session?: SerializedSession | null;
				user?: SerializedUser | null;
			} | null;
			securityInfo?: {
				requireCaptcha: boolean;
				securityLevel: 'low' | 'medium' | 'high';
				riskScore: number;
				deviceTrusted: boolean;
			};
			fraudAnalysis?: FraudAnalysis | null;
			requireAdditionalAuth?: boolean;
			riskFlags?: string[];
			authenticatedUserId?: string;
		}

		interface PageData {
			user?: SerializedUser | null;
			session?: SerializedSession | null;
		}
	}
}

// Extend the real browser Window so that `window.Cap` is recognised everywhere
declare global {
	interface Window {
		Cap: {
			new (options: App.CapOptions): App.CapInstance;
		};
	}
}

// Fix for Zod v4 compatibility with sveltekit-superforms
declare module 'sveltekit-superforms' {
	interface ZodValidationSchema {
		// Allow any Zod schema
	}
}

// This file doesn't need any exports since it's augmenting global types

export {};
