<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let owner = $derived(data.role.split(',').includes('owner'));
</script>
<svelte:head><title>{data.organisation.name} — Organisation settings</title></svelte:head>
<header><h1 class="text-3xl font-semibold">{data.organisation.name}</h1><p class="mt-2 text-muted-foreground">Organisation settings · Your role: {data.role}</p></header>
{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}
{#if data.manager}
	<Card.Root>
		<Card.Header><Card.Title>Workspaces</Card.Title><Card.Description>Administrative access does not automatically grant access to workspace content.</Card.Description></Card.Header>
		<Card.Content class="flex flex-col gap-5">
			{#each data.workspaces as workspace (workspace.id)}
				<div class="flex flex-wrap items-center gap-3"><p>{workspace.name} · {workspace.status}</p>
					{#if workspace.status === 'active'}
						<form method="POST" action="?/archive" class="flex flex-wrap gap-2"><input type="hidden" name="workspaceId" value={workspace.id} /><Input name="confirmation" aria-label={`Type ARCHIVE to close ${workspace.name}`} placeholder="Type ARCHIVE" required /><Button type="submit" variant="outline">Archive</Button></form>
					{/if}
				</div>
			{:else}<p>No workspaces yet. Create the first one below.</p>{/each}
			<form method="POST" action="?/createWorkspace" class="flex flex-col gap-3">
				<Label for="workspace-name">New workspace name</Label><Input id="workspace-name" name="name" required maxlength={120} />
				<Label for="workspace-slug">Workspace address</Label><Input id="workspace-slug" name="slug" required maxlength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
				<Button type="submit">Create workspace</Button>
			</form>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header><Card.Title>Members</Card.Title><Card.Description>Removing a member immediately removes access to this organisation's workspaces.</Card.Description></Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#each data.members as member (member.userId)}
				<div class="flex flex-wrap items-center justify-between gap-3"><p>{member.name} · {member.email} · {member.role}</p>
					<form method="POST" action="?/remove"><input type="hidden" name="targetUserId" value={member.userId} /><Button variant="outline" type="submit">Remove member</Button></form>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header><Card.Title>Invitations and setup</Card.Title><Card.Description>Create invitations from a workspace. Retry interrupted setup or resend pending invitations here.</Card.Description></Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#each data.invitations as invitation (invitation.id)}
				<div class="flex flex-wrap items-center gap-3"><p>{invitation.email} · {invitation.state.replaceAll('_', ' ')} · {invitation.attempts} attempts</p>
					{#if invitation.state === 'pending_acceptance'}
						<form method="POST" action="?/resend"><input type="hidden" name="invitationId" value={invitation.invitationId} /><Button type="submit" variant="outline">Resend</Button></form>
					{/if}
					{#if ['pending_acceptance', 'provisioning', 'retry_pending'].includes(invitation.state)}
						<form method="POST" action="?/cancel"><input type="hidden" name="invitationId" value={invitation.invitationId} /><Button type="submit" variant="outline">Cancel</Button></form>
					{/if}
					{#if ['provisioning', 'retry_pending'].includes(invitation.state)}
						<form method="POST" action="?/retry"><input type="hidden" name="provisioningId" value={invitation.id} /><Button type="submit" variant="outline">Retry setup</Button></form>
					{/if}
				</div>
			{:else}<p class="text-muted-foreground">No invitations yet.</p>{/each}
		</Card.Content>
	</Card.Root>
{/if}
{#if owner}
	<Card.Root>
		<Card.Header><Card.Title>Grant workspace access</Card.Title><Card.Description>Owner grants are explicit and recorded, including grants to yourself.</Card.Description></Card.Header>
		<Card.Content>
			<form method="POST" action="?/grant" class="flex flex-col gap-3">
				<Label for="grant-workspace">Workspace</Label><select id="grant-workspace" name="workspaceId" required class="rounded-md border bg-background p-2">{#each data.workspaces.filter((w) => w.status === 'active') as workspace (workspace.id)}<option value={workspace.id}>{workspace.name}</option>{/each}</select>
				<Label for="grant-member">Member</Label><select id="grant-member" name="targetUserId" required class="rounded-md border bg-background p-2">{#each data.members as member (member.userId)}<option value={member.userId}>{member.name} ({member.email})</option>{/each}</select>
				<Label for="grant-role">Workspace role</Label><select id="grant-role" name="role" class="rounded-md border bg-background p-2"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="editor">Editor</option><option value="workspace_admin">Workspace admin</option></select>
				<Label for="grant-reason">Reason</Label><Input id="grant-reason" name="reason" required maxlength={500} />
				<Button type="submit">Grant access</Button>
			</form>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header><Card.Title>Transfer ownership</Card.Title><Card.Description>The new owner must already be a verified member. You become an organisation admin. Personal subscriptions stay with their purchaser. Sign in again if your session is more than an hour old.</Card.Description></Card.Header>
		<Card.Content>
			<form method="POST" action="?/transfer" class="flex flex-col gap-3">
				<Label for="transfer-member">New owner</Label><select id="transfer-member" name="targetUserId" required class="rounded-md border bg-background p-2">{#each data.members.filter((m) => m.emailVerified) as member (member.userId)}<option value={member.userId}>{member.name} ({member.email})</option>{/each}</select>
				<Label for="transfer-reason">Reason</Label><Input id="transfer-reason" name="reason" required maxlength={500} />
				<Label for="transfer-confirmation">Type TRANSFER to confirm</Label><Input id="transfer-confirmation" name="confirmation" required />
				<Button type="submit" variant="outline">Transfer ownership</Button>
			</form>
		</Card.Content>
	</Card.Root>
{/if}
<form method="POST" action="?/remove"><input type="hidden" name="targetUserId" value={data.user.id} /><Button type="submit" variant="outline">Leave organisation</Button></form>
