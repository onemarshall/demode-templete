<!-- src/lib/modules/auth/components/EmailCodeRequest.svelte -->
<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Loader, Mail } from '@lucide/svelte';

	let {
		sendNewOtp,
		isLoading = false
	}: {
		sendNewOtp: () => Promise<void>;
		isLoading: boolean;
	} = $props();
</script>

<div class="space-y-4 text-center">
	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
	>
		<div class="mb-3 flex items-center justify-center">
			<Mail class="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
			<p class="text-sm font-medium text-blue-800 dark:text-blue-200">
				Email Verification Required
			</p>
		</div>
		<p class="mb-4 text-sm text-blue-700 dark:text-blue-300">
			We'll send a 6-digit verification code to your registered email address.
		</p>
		<Button onclick={sendNewOtp} disabled={isLoading} class="w-full" size="lg">
			{#if isLoading}
				<Loader class="h-4 w-4 animate-spin" />
				Sending Code...
			{:else}
				<Mail class="h-4 w-4" />
				Send Verification Code
			{/if}
		</Button>
	</div>
</div>
