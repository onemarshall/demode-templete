// lib/client/stores/webauthn.svelte.ts
import { browser } from '$app/env';

export function createWebAuthnStore() {
	let isSupported = $state(false);

	if (browser) {
		isSupported = !!(
			window.PublicKeyCredential &&
			typeof window.PublicKeyCredential === 'function' &&
			'create' in navigator.credentials &&
			'get' in navigator.credentials
		);
	}

	return {
		get isSupported() {
			return isSupported;
		}
	};
}
