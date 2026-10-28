<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let owner = $derived(data.role.split(',').includes('owner'));

	const BRAND_ROLES = [
		{ value: 'viewer', label: 'Viewer' },
		{ value: 'contributor', label: 'Contributor' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'brand_admin', label: 'Brand admin' }
	];

	let grantBrand = $state('');
	let grantMember = $state('');
	let grantRole = $state('viewer');
	let transferMember = $state('');
	let archiveBrand = $state<{ id: string; name: string } | null>(null);
</script>
<svelte:head><title>{data.organisation.name} — Brand settings</title></svelte:head>
<header><h1 class="text-3xl font-semibold">{data.organisation.name}</h1><p class="mt-2 text-muted-foreground">Brand settings · Your role: {data.role}</p></header>
{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}
{#if data.manager}
	<div class="grid items-start gap-6 lg:grid-cols-2">
		<Card.Root>
			<Card.Header><Card.Title>Brands</Card.Title><Card.Description>Administrative access does not automatically grant access to brand content.</Card.Description></Card.Header>
			<Card.Content class="flex flex-col gap-2">
				{#each data.brands as brand (brand.id)}
					<div class="flex items-center justify-between gap-3"><p>{brand.name} · {brand.status}</p>
						{#if brand.status === 'active'}<Button variant="ghost" size="sm" onclick={() => (archiveBrand = brand)}>Archive</Button>{/if}
					</div>
				{:else}<p>No brands yet.</p>{/each}
			</Card.Content>
			<Card.Footer>
				<Dialog.Root>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="outline">Create brand</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header><Dialog.Title>Create brand</Dialog.Title><Dialog.Description>Give this brand a name.</Dialog.Description></Dialog.Header>
						<form method="POST" action="?/createBrand" class="flex flex-col gap-3">
							<Label for="brand-name">Brand name</Label><Input id="brand-name" name="name" required maxlength={120} />
							<Dialog.Footer><Button type="submit">Create brand</Button></Dialog.Footer>
						</form>
					</Dialog.Content>
				</Dialog.Root>
			</Card.Footer>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Title>Members</Card.Title><Card.Description>Removing a member immediately removes their access to every brand here.</Card.Description></Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#each data.members as member (member.userId)}
					<div class="flex flex-wrap items-center justify-between gap-3"><p>{member.name} · {member.email} · {member.role}</p>
						<form method="POST" action="?/remove"><input type="hidden" name="targetUserId" value={member.userId} /><Button variant="ghost" size="sm" type="submit">Remove member</Button></form>
					</div>
				{/each}
			</Card.Content>
			{#if owner}
				<Card.Footer>
					<Dialog.Root>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline">Grant brand access</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header><Dialog.Title>Grant brand access</Dialog.Title><Dialog.Description>Owner grants are explicit and recorded, including grants to yourself.</Dialog.Description></Dialog.Header>
							<form method="POST" action="?/grant" class="flex flex-col gap-3">
								<Label id="grant-brand-label">Brand</Label>
								<Select.Root type="single" name="brandId" bind:value={grantBrand} required items={data.brands.filter((b) => b.status === 'active').map((b) => ({ value: b.id, label: b.name }))}>
									<Select.Trigger class="w-full" aria-labelledby="grant-brand-label"><Select.Value placeholder="Choose a brand" /></Select.Trigger>
									<Select.Content>
										{#each data.brands.filter((b) => b.status === 'active') as brand (brand.id)}<Select.Item value={brand.id}>{brand.name}</Select.Item>{/each}
									</Select.Content>
								</Select.Root>
								<Label id="grant-member-label">Member</Label>
								<Select.Root type="single" name="targetUserId" bind:value={grantMember} required items={data.members.map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` }))}>
									<Select.Trigger class="w-full" aria-labelledby="grant-member-label"><Select.Value placeholder="Choose a member" /></Select.Trigger>
									<Select.Content>
										{#each data.members as member (member.userId)}<Select.Item value={member.userId}>{member.name} ({member.email})</Select.Item>{/each}
									</Select.Content>
								</Select.Root>
								<Label id="grant-role-label">Brand role</Label>
								<Select.Root type="single" name="role" bind:value={grantRole} required items={BRAND_ROLES}>
									<Select.Trigger class="w-full" aria-labelledby="grant-role-label"><Select.Value /></Select.Trigger>
									<Select.Content>
										{#each BRAND_ROLES as role (role.value)}<Select.Item value={role.value}>{role.label}</Select.Item>{/each}
									</Select.Content>
								</Select.Root>
								<Label for="grant-reason">Reason</Label><Input id="grant-reason" name="reason" required maxlength={500} />
								<Dialog.Footer><Button type="submit">Grant access</Button></Dialog.Footer>
							</form>
						</Dialog.Content>
					</Dialog.Root>
				</Card.Footer>
			{/if}
		</Card.Root>
	</div>
	{#if data.invitations.length}
		<Card.Root>
			<Card.Header><Card.Title>Invitations and setup</Card.Title><Card.Description>Create invitations from a brand. Retry interrupted setup or resend pending invitations here.</Card.Description></Card.Header>
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
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
{/if}
<Card.Root>
	<Card.Header><Card.Title>Danger zone</Card.Title><Card.Description>Irreversible or sensitive actions. Each one asks you to confirm before it happens.</Card.Description></Card.Header>
	<Card.Content class="flex flex-wrap gap-3">
		{#if owner}
			<Dialog.Root>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline">Transfer ownership</Button>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header><Dialog.Title>Transfer ownership</Dialog.Title><Dialog.Description>The new owner must already be a verified member. You become a brand admin. Personal subscriptions stay with their purchaser. Sign in again if your session is more than an hour old.</Dialog.Description></Dialog.Header>
					<form method="POST" action="?/transfer" class="flex flex-col gap-3">
						<Label id="transfer-member-label">New owner</Label>
						<Select.Root type="single" name="targetUserId" bind:value={transferMember} required items={data.members.filter((m) => m.emailVerified).map((m) => ({ value: m.userId, label: `${m.name} (${m.email})` }))}>
							<Select.Trigger class="w-full" aria-labelledby="transfer-member-label"><Select.Value placeholder="Choose a member" /></Select.Trigger>
							<Select.Content>
								{#each data.members.filter((m) => m.emailVerified) as member (member.userId)}<Select.Item value={member.userId}>{member.name} ({member.email})</Select.Item>{/each}
							</Select.Content>
						</Select.Root>
						<Label for="transfer-reason">Reason</Label><Input id="transfer-reason" name="reason" required maxlength={500} />
						<Label for="transfer-confirmation">Type TRANSFER to confirm</Label><Input id="transfer-confirmation" name="confirmation" required />
						<Dialog.Footer><Button type="submit" variant="destructive">Transfer ownership</Button></Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		{/if}
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline">Leave brand</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header><Dialog.Title>Leave brand</Dialog.Title><Dialog.Description>You lose access to every brand here immediately.</Dialog.Description></Dialog.Header>
				<form method="POST" action="?/remove">
					<input type="hidden" name="targetUserId" value={data.user.id} />
					<Dialog.Footer><Button type="submit" variant="destructive">Leave brand</Button></Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</Card.Content>
</Card.Root>
<Dialog.Root open={archiveBrand !== null} onOpenChange={(open) => { if (!open) archiveBrand = null; }}>
	<Dialog.Content>
		<Dialog.Header><Dialog.Title>Close {archiveBrand?.name ?? 'brand'}</Dialog.Title><Dialog.Description>Archiving restricts access to this brand's content and stops its pending invitations.</Dialog.Description></Dialog.Header>
		<form method="POST" action="?/archive" class="flex flex-col gap-3">
			<input type="hidden" name="brandId" value={archiveBrand?.id} />
			<Label for="archive-confirmation">Type ARCHIVE to confirm</Label><Input id="archive-confirmation" name="confirmation" required />
			<Dialog.Footer><Button type="submit" variant="destructive">Archive brand</Button></Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
