<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import { CheckCircle, Home } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { createConsola } from 'consola/browser';

	const logger = createConsola({
		level: 3,
		formatOptions: {
			colors: true,
			date: true
		}
	});

	onMount(() => {
		logger.info('User viewed account deletion confirmation page');

		const timer = setTimeout(() => {
			goto('/');
		}, 100000);

		return () => clearTimeout(timer);
	});

	function handleGoHome() {
		goto('/');
	}
</script>

<div class="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
	<Card.Root>
		<Card.Header class="text-center">
			<div
				class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
			>
				<CheckCircle class="h-8 w-8 text-green-600 dark:text-green-400" />
			</div>
			<Card.Title class="text-2xl font-bold tracking-tight">Account Deleted</Card.Title>
			<Card.Description>
				<p>
					Your account and all associated data have been permanently deleted. We're sorry to see you
					go!
				</p>
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-center justify-center">
			<Card.Description class="pt-4">
				<Button onclick={handleGoHome} class="w-full sm:w-auto">
					<Home class="h-4 w-4" />
					Return to Home
				</Button>
			</Card.Description>
		</Card.Content>
		<Card.Footer>
			<Card.Description class="text-center">
				You will be automatically redirected to the home page in 10 seconds...
			</Card.Description>
		</Card.Footer>
	</Card.Root>
</div>
