<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Check, Shield } from '@lucide/svelte';

	let { onComplete } = $props();
	let isLoading = $state(false);
	let mockToken = $state('');

	async function simulateCaptcha() {
		isLoading = true;

		// Simulate captcha processing time
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Generate mock token
		mockToken = 'mock-captcha-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

		isLoading = false;

		// Call completion callback
		onComplete?.(mockToken);
	}
</script>

<Card.Root class="border-dashed">
	<Card.Content class="pt-6">
		<div class="space-y-4 text-center">
			<div class="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
				<Shield class="text-muted-foreground h-6 w-6" />
			</div>

			<div>
				<h3 class="font-medium">Mock Captcha Test</h3>
				<p class="text-muted-foreground mt-1 text-sm">
					Simulating captcha widget for testing purposes
				</p>
			</div>

			{#if mockToken}
				<div class="rounded-lg border border-green-200 bg-green-50 p-3">
					<div class="flex items-center gap-2 text-green-700">
						<Check class="h-4 w-4" />
						<span class="text-sm">Captcha completed!</span>
					</div>
					<p class="mt-1 text-xs break-all text-green-600">
						Token: {mockToken}
					</p>
				</div>
			{:else}
				<Button onclick={simulateCaptcha} disabled={isLoading} class="w-full">
					{#if isLoading}
						<div
							class="border-primary mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
						></div>
						Verifying...
					{:else}
						Simulate Captcha
					{/if}
				</Button>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
