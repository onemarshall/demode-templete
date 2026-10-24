<script lang="ts">
	import { authClient } from '#lib/auth/auth-client.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	let { data } = $props();
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');
	async function sendLink() {
		loading = true; error = '';
		try {
			const response = await authClient.requestPasswordReset({ email: data.email, redirectTo: '/auth/reset-password' });
			if (response.error) throw new Error(response.error.message || 'Unable to send the password link.');
			sent = true;
		} catch (err) { error = err instanceof Error ? err.message : 'Unable to send the password link.'; }
		finally { loading = false; }
	}
</script>

<Card.Root class="mx-auto w-full max-w-lg">
	<Card.Header><Card.Title>Set password</Card.Title><Card.Description>We will send a verification link to {data.email}. Open it to create a password for this account.</Card.Description></Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if error}<Alert.Root variant="destructive"><Alert.Title>{error}</Alert.Title></Alert.Root>{/if}
		{#if sent}<Alert.Root><Alert.Title>Check your inbox for the password link.</Alert.Title></Alert.Root>{/if}
		<Button onclick={sendLink} disabled={loading || sent}>{#if loading}<Spinner />{/if}Send password link</Button>
	</Card.Content>
	<Card.Footer><Button variant="ghost" href="/auth/security">Back to sign-in & security</Button></Card.Footer>
</Card.Root>
