<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();

	// Better Auth joins multiple organisation roles with commas.
	const canManage = (role: string) => /(^|,)(owner|admin)(,|$)/.test(role);
</script>
<svelte:head>
	<title>Your organisations</title>
</svelte:head>

<header>
	<h1 class="text-3xl font-semibold">Your organisations</h1><p class="mt-2 text-muted-foreground">An organisation owns one or more brands. Choose a brand to work in — each keeps its own content and access.</p>
</header>

{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}

<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.organisations as org (org.organisationId)}
		<Card.Root class="h-full">
			<Card.Header><Card.Title>{org.organisationName}</Card.Title><Card.Description>{org.brands.length} {org.brands.length === 1 ? 'brand' : 'brands'}</Card.Description></Card.Header>
			<Card.Content class="flex flex-1 flex-wrap content-start gap-3">
				{#each org.brands as brand (brand.brandId)}
					<Button variant={data.preference.lastBrandId === brand.brandId ? 'default' : 'outline'} href={`/o/${encodeURIComponent(org.organisationSlug)}/${encodeURIComponent(brand.brandSlug)}`}>{brand.brandName}</Button>
				{:else}<p class="text-sm text-muted-foreground">No brands assigned to you here yet. A brand owner can grant access.</p>{/each}
			</Card.Content>
			<Card.Footer class="flex flex-wrap gap-2">
				<Button variant="outline" href={`/o/${encodeURIComponent(org.organisationSlug)}/settings`}>Organisation settings</Button>
				{#if canManage(org.role)}
					<Dialog.Root>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline">Add brand</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Add a brand</Dialog.Title>
								<Dialog.Description>A new brand inside {org.organisationName}.</Dialog.Description>
							</Dialog.Header>
							<form method="POST" action="?/createBrand" class="flex flex-col gap-4">
								<input type="hidden" name="organisationSlug" value={org.organisationSlug} />
								<fieldset class="flex flex-col gap-2"><Label for={`brand-name-${org.organisationId}`}>Brand name</Label><Input id={`brand-name-${org.organisationId}`} name="name" required maxlength={120} autocomplete="organization" /></fieldset>
								<Dialog.Footer><Button type="submit">Add brand</Button></Dialog.Footer>
							</form>
						</Dialog.Content>
					</Dialog.Root>
				{/if}
			</Card.Footer>
		</Card.Root>
	{:else}
		<Card.Root class="sm:col-span-2 lg:col-span-3"><Card.Header><Card.Title>Start with your own organisation</Card.Title><Card.Description>Create a personal organisation with a default brand, or accept an invitation sent to your email.</Card.Description></Card.Header><Card.Footer><form method="POST" action="?/personal"><Button type="submit">Create my organisation</Button></form></Card.Footer></Card.Root>
	{/each}
</div>

<div class="flex items-center gap-4">
	<Separator class="flex-1" />
	<p class="text-sm text-muted-foreground">Need another organisation?</p>
	<Separator class="flex-1" />
</div>

<div class="flex justify-center">
	<Dialog.Root>
		<Dialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline">Create an organisation</Button>
			{/snippet}
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Create an organisation</Dialog.Title>
				<Dialog.Description>For a business, a client or another group you manage. You can add more brands to it afterwards.</Dialog.Description>
			</Dialog.Header>
			<form method="POST" action="?/create" class="flex flex-col gap-4">
				<fieldset class="flex flex-col gap-2"><Label for="org-name">Organisation name</Label><Input id="org-name" name="name" required maxlength={120} autocomplete="organization" /></fieldset>
				<fieldset class="flex flex-col gap-2"><Label for="org-brand-name">First brand name</Label><Input id="org-brand-name" name="brandName" required maxlength={120} /></fieldset>
				<Dialog.Footer><Button type="submit">Create organisation</Button></Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
