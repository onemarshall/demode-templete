// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env?: Record<string, unknown>;
			ctx?: {
				waitUntil(promise: Promise<unknown>): void;
				passThroughOnException?(): void;
			};
			caches?: CacheStorage;
			cf?: Record<string, unknown>;
		}

		// interface Error {}
		interface Locals {
			nonce?: string;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
