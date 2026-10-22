<!-- src/routes/auth/consent/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Loader, ShieldCheck, X } from '@lucide/svelte';

	let oauthQuery = $state('');
	let clientId = $state('');
	let clientName = $state('');
	let scopes: string[] = $state([]);
	let claims: string[] = $state([]);
	let isLoading = $state(false);
	let error = $state('');
	let hasError = $derived(error.length > 0);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		oauthQuery = window.location.search;
		clientId = params.get('client_id') ?? '';
		clientName = clientId;
		try {
			clientName = new URL(clientId).hostname;
		} catch {
			// non-URL client ids (e.g. registered clients) are shown as-is
		}
		scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);
		try {
			const claimsRaw = params.get('claims');
			if (claimsRaw) {
				const parsed = JSON.parse(claimsRaw);
				claims = parsed?.userinfo ? Object.keys(parsed.userinfo) : [];
			}
		} catch {
			// malformed claims request — ignore
		}
	});

	async function decide(accept: boolean) {
		isLoading = true;
		error = '';
		try {
			const response = await fetch('/api/auth/oauth2/consent', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ accept, oauth_query: oauthQuery })
			});
			if (response.redirected) {
				window.location.href = response.url;
				return;
			}
			const body = await response.json().catch(() => null);
			if (body?.redirect_uri) {
				window.location.href = body.redirect_uri;
				return;
			}
			if (!response.ok) {
				error = body?.error_description ?? body?.message ?? 'Authorization failed. Please try again.';
			} else {
				error = 'Unexpected response from the authorization server.';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
	<Card.Root class="w/full mx-auto max-w-md">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">Authorize Application</Card.Title>
			<Card.Description>
				{clientName || 'An application'} is requesting access to your account
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if hasError}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			{#if scopes.length > 0 || claims.length > 0}
				<div class="space-y-3">
					{#if scopes.length > 0}
						<div>
							<p class="text-sm font-medium">Requested permissions</p>
							<ul class="mt-2 space-y-1.5 text-sm text-muted-foreground">
								{#each scopes as scope}
									<li class="flex items-center gap-2">
										<ShieldCheck class="size-4 shrink-0" />
										<code class="rounded bg-muted px-1.5 py-0.5">{scope}</code>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if claims.length > 0}
						<div>
							<p class="text-sm font-medium">Requested profile claims</p>
							<ul class="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
								{#each claims as claim}
									<li class="rounded-md bg-muted px-2 py-1">
										<code>{claim}</code>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No additional permissions are being requested.</p>
			{/if}

			<div class="space-y-2 pt-2">
				<Button type="button" class="w-full" disabled={isLoading} onclick={() => decide(true)}>
					{#if isLoading}
						<Loader class="size-4 animate-spin" />
					{:else}
						<ShieldCheck class="size-4" />
					{/if}
					Allow
				</Button>
				<Button
					type="button"
					variant="outline"
					class="w-full"
					disabled={isLoading}
					onclick={() => decide(false)}
				>
					<X class="size-4" />
					Deny
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="text-muted-foreground mt-4 text-center text-xs">
		Not signed in?{' '}
		<a href="/auth/sign-in" class="hover:text-foreground underline">Sign in here</a>
	</div>
</div>
