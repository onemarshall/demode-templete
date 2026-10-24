<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { authClient } from '#lib/auth/auth-client.js';
	import { publicEnv } from '#lib/auth/shared/env/index.js';
	import { invalidateAll } from '$app/navigation';
	let { accounts, hasPassword = false }: { accounts: { id: string; providerId: string }[]; hasPassword?: boolean } = $props();
	let busy = $state('');
	let error = $state('');
	const providers = $derived([
		{ id: 'google' as const, label: 'Google', enabled: publicEnv.PUBLIC_AUTH_GOOGLE_ENABLED },
		{ id: 'github' as const, label: 'GitHub', enabled: publicEnv.PUBLIC_AUTH_GITHUB_ENABLED }
	].filter((provider) => provider.enabled || accounts.some((account) => account.providerId === provider.id)));
	function hasAlternative(accountId: string): boolean {
		return accounts.some((account) => account.id !== accountId && (
			(['credential', 'email', 'password'].includes(account.providerId) && hasPassword) ||
			(account.providerId === 'google' && publicEnv.PUBLIC_AUTH_GOOGLE_ENABLED) ||
			(account.providerId === 'github' && publicEnv.PUBLIC_AUTH_GITHUB_ENABLED)
		));
	}
	async function connect(provider: 'google' | 'github') {
		busy = provider; error = '';
		try {
			const response = await authClient.linkSocial({ provider, callbackURL: '/auth/security', errorCallbackURL: '/auth/security' });
			if (response.error) throw new Error(response.error.message || 'Unable to connect this account.');
		} catch (err) { error = err instanceof Error ? err.message : 'Unable to connect this account.'; }
		finally { busy = ''; }
	}
	async function disconnect(accountId: string) {
		busy = accountId; error = '';
		try {
			const response = await authClient.unlinkAccount({ accountId });
			if (response.error) throw new Error(response.error.message || 'Unable to disconnect this account.');
			await invalidateAll();
		} catch (err) { error = err instanceof Error ? err.message : 'Unable to disconnect this account.'; }
		finally { busy = ''; }
	}
</script>

{#if providers.length > 0}
	<Card.Root>
		<Card.Header><Card.Title>Connected login providers</Card.Title><Card.Description>Connect another way to sign in. Keep at least one usable sign-in method connected.</Card.Description></Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#if error}<Alert.Root variant="destructive"><Alert.Title>{error}</Alert.Title></Alert.Root>{/if}
			{#each providers as provider (provider.id)}
				{@const connected = accounts.filter((account) => account.providerId === provider.id)}
				<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
					<div><h3 class="font-medium">{provider.label}</h3><p class="text-muted-foreground text-sm">{connected.length ? 'Connected' : 'Not connected'}</p></div>
					{#each connected as account (account.id)}
						<Button variant="outline" disabled={busy !== '' || !hasAlternative(account.id)} onclick={() => disconnect(account.id)}>{#if busy === account.id}<Spinner />{/if}Disconnect</Button>
					{:else}
						<Button variant="outline" disabled={busy !== '' || !provider.enabled} onclick={() => connect(provider.id)}>{#if busy === provider.id}<Spinner />{/if}Connect {provider.label}</Button>
					{/each}
				</div>
			{/each}
			{#if accounts.some((account) => !hasAlternative(account.id))}<p class="text-muted-foreground text-sm">Set a password or connect another enabled provider before disconnecting your last usable sign-in method.</p>{/if}
		</Card.Content>
	</Card.Root>
{/if}
