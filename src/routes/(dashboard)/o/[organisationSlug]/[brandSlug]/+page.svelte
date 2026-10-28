<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();

	const BRAND_ROLES = [
		{ value: 'viewer', label: 'Viewer' },
		{ value: 'contributor', label: 'Contributor' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'brand_admin', label: 'Brand admin' }
	];

	let inviteRole = $state('viewer');
	let grantMember = $state('');
	let grantRole = $state('viewer');
</script>
<svelte:head><title>{data.route.brand.name} — {data.route.organisation.name}</title></svelte:head>
<header><p class="text-sm text-muted-foreground">{data.route.organisation.name}</p><h1 class="mt-2 text-3xl font-semibold">{data.route.brand.name}</h1><p class="mt-2 text-muted-foreground">Your brand role: {data.role.replaceAll('_', ' ')}</p></header>
{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}
<div class="flex flex-wrap gap-3"><Button variant="outline" href={`/o/${encodeURIComponent(data.route.organisation.slug)}/settings`}>Brand settings</Button><form method="POST" action="?/remember"><Button type="submit" variant="outline">Use as preferred brand</Button></form></div>
{#if data.manager}
	<div class="grid items-start gap-6 lg:grid-cols-2">
		<Card.Root><Card.Header><Card.Title>Brand settings</Card.Title><Card.Description>Update this brand's name.</Card.Description></Card.Header><Card.Content><form method="POST" action="?/rename" class="flex flex-col gap-3"><Label for="name">Brand name</Label><Input id="name" name="name" value={data.route.brand.name} required maxlength={120} /><Button type="submit">Save name</Button></form></Card.Content></Card.Root>
		{#if data.canInvite}<Card.Root>
			<Card.Header><Card.Title>Invite a member</Card.Title><Card.Description>Brand admins can invite only into brands they administer. Invitations require a verified recipient email.</Card.Description></Card.Header>
			<Card.Content><form method="POST" action="?/invite" class="flex flex-col gap-3"><Label for="email">Email address</Label><Input id="email" name="email" type="email" required maxlength={254} /><Label id="invite-role-label">Brand role</Label>
				<Select.Root type="single" name="role" bind:value={inviteRole} required items={BRAND_ROLES}>
					<Select.Trigger class="w-full" aria-labelledby="invite-role-label"><Select.Value /></Select.Trigger>
					<Select.Content>{#each BRAND_ROLES as role (role.value)}<Select.Item value={role.value}>{role.label}</Select.Item>{/each}</Select.Content>
				</Select.Root>
				<Button type="submit">Send invitation</Button></form></Card.Content>
		</Card.Root>{/if}
		<Card.Root class="lg:col-span-2">
			<Card.Header><Card.Title>Brand members</Card.Title><Card.Description>Brand assignments apply only while membership remains active.</Card.Description></Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#each data.members as member (member.id)}
					<div class="flex flex-wrap items-center gap-3"><p>{member.name} ({member.email}) · {member.role.replaceAll('_', ' ')}</p>
						<form method="POST" action="?/revoke"><input type="hidden" name="targetUserId" value={member.userId} /><Button type="submit" variant="outline">Remove brand access</Button></form>
					</div>
				{/each}
				<form method="POST" action="?/grant" class="flex flex-col gap-3">
					<Label id="target-user-label">Brand member</Label>
					<Select.Root type="single" name="targetUserId" bind:value={grantMember} required items={data.availableMembers.map((member) => ({ value: member.userId, label: `${member.name} (${member.email})` }))}>
						<Select.Trigger class="w-full" aria-labelledby="target-user-label"><Select.Value placeholder="Choose a member" /></Select.Trigger>
						<Select.Content>{#each data.availableMembers as member (member.userId)}<Select.Item value={member.userId}>{member.name} ({member.email})</Select.Item>{/each}</Select.Content>
					</Select.Root>
					<Label id="member-role-label">Brand role</Label>
					<Select.Root type="single" name="role" bind:value={grantRole} required items={BRAND_ROLES}>
						<Select.Trigger class="w-full" aria-labelledby="member-role-label"><Select.Value /></Select.Trigger>
						<Select.Content>{#each BRAND_ROLES as role (role.value)}<Select.Item value={role.value}>{role.label}</Select.Item>{/each}</Select.Content>
					</Select.Root>
					<Button type="submit">Update member access</Button>
				</form>
			</Card.Content>
		</Card.Root>
		<Card.Root class="lg:col-span-2"><Card.Header><Card.Title>Recent brand activity</Card.Title><Card.Description>Consequential changes to this brand.</Card.Description></Card.Header><Card.Content><ul class="flex flex-col gap-2">{#each data.audit as event (event.id)}<li class="text-sm">{event.action} · {new Date(event.createdAt).toLocaleString('en-GB')}</li>{:else}<li class="text-muted-foreground">No activity recorded.</li>{/each}</ul></Card.Content></Card.Root>
	</div>
{/if}
