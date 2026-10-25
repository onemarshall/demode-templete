<!-- src/lib/modules/auth/features/profile/components/security/PasskeyManager/components/PasskeyWebAuthnCheck.svelte -->
<script lang="ts">
	import { AlertCircle } from '@lucide/svelte';

	let isWebAuthnSupported = $state(true);

	$effect(() => {
		if (typeof window !== 'undefined') {
			isWebAuthnSupported = !!(
				window.PublicKeyCredential &&
				typeof window.PublicKeyCredential === 'function' &&
				'create' in navigator.credentials &&
				'get' in navigator.credentials
			);
		}
	});

	// Ensure proper export for TypeScript
	export { isWebAuthnSupported };
</script>

{#if !isWebAuthnSupported}
	<div
		class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950"
	>
		<div class="flex items-center gap-2">
			<AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
			<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
				WebAuthn Not Supported
			</span>
		</div>
		<p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
			Your browser doesn't support passkeys. Please use a modern browser like Chrome, Firefox,
			Safari, or Edge.
		</p>
	</div>
{/if}
