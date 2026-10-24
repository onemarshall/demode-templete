<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>
<svelte:head><title>Invitation to {data.invitation.organisationName}</title></svelte:head>
{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}
<Card.Root>
	<Card.Header><Card.Title>Join {data.invitation.organisationName}</Card.Title><Card.Description>Invitation status: {data.invitation.state.replaceAll('_', ' ')}</Card.Description></Card.Header>
	<Card.Content><p>Expires {new Date(data.invitation.expiresAt).toLocaleString('en-GB')}.</p>{#if !data.emailVerified}<p class="mt-3">Verify your email address before accepting this invitation.</p>{/if}{#if ['retry_pending', 'provisioning'].includes(data.invitation.state)}<p class="mt-3">Your organisation membership is recorded. Brand setup is still pending. A retry is available after the recovery delay.</p>{/if}{#if ['cancelled', 'expired', 'permanently_failed'].includes(data.invitation.state)}<p class="mt-3">Ask the organisation owner to review your access. Existing members can be assigned directly; otherwise, request a new invitation.</p>{/if}</Card.Content>
	<Card.Footer class="flex flex-wrap gap-3">
		{#if data.invitation.status === 'pending' && data.invitation.state === 'pending_acceptance'}
			<form method="POST" action="?/accept"><Button type="submit" disabled={!data.emailVerified}>Accept invitation</Button></form>
			<form method="POST" action="?/reject"><Button type="submit" variant="outline">Decline</Button></form>
		{:else if data.invitation.status === 'accepted' && ['pending_acceptance', 'retry_pending', 'provisioning'].includes(data.invitation.state)}
			<form method="POST" action="?/retry"><Button type="submit">Retry brand setup</Button></form>
		{/if}
		<Button href="/organisations" variant="outline">View your organisations</Button>
	</Card.Footer>
</Card.Root>
