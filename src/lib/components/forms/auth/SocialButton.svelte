<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils.ts';
	import { logger } from '$lib/auth/shared/logger';

	type ButtonVariant = 'default' | 'link' | 'destructive' | 'outline' | 'secondary' | 'ghost';

	// Props with defaults using destructuring
	const {
		loadingtext = 'Signing in...',
		text = 'Continue with Provider',
		provider = 'github',
		icon = '',
		iconSize = '1rem',
		variant = 'outline',
		class: className = 'w-full'
	}: {
		loadingtext?: string;
		text?: string;
		provider?: string;
		icon?: string;
		iconSize?: string;
		variant?: ButtonVariant;
		class?: string;
	} = $props();

	// State
	let isLoading = $state(false);

	// Handle social sign-in
	async function handleSocialSignIn() {
		try {
			isLoading = true;
			const result = await authClient.signIn.social({
				provider,
				callbackURL: '/auth/profile'
			});

			logger.debug(`${provider} OAuth result:`, result);

			if (result.error) {
				logger.error(`${provider} OAuth error:`, result.error);
			}
		} catch (error) {
			logger.error(`Error during ${provider} sign in:`, error);
		} finally {
			isLoading = false;
		}
	}
</script>

<Button
	onclick={handleSocialSignIn}
	{variant}
	class={cn('flex w-full items-center justify-center gap-3', className)}
	disabled={isLoading}
>
	{#if icon}
		<span class="shrink-0" style="width: {iconSize}; height: {iconSize}">
			{@html icon}
		</span>
	{/if}
	<span>{isLoading ? loadingtext : text}</span>
</Button>
