<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>
<svelte:head>
	<title>Your organisations</title>
</svelte:head>

<header>
	<h1 class="text-3xl font-semibold">Your organisations</h1><p class="mt-2 text-muted-foreground">Choose where you want to work. Each brand keeps its own content and access.</p>
</header>

{#if form?.message}<Alert.Root role="status"><Alert.Description>{form.message}</Alert.Description></Alert.Root>{/if}

{#each data.organisations as org (org.organisationId)}
	<Card.Root>
		<Card.Header><Card.Title>{org.organisationName}</Card.Title><Card.Description>{org.brands.length} assigned brands</Card.Description></Card.Header>
		<Card.Content class="flex flex-wrap gap-3">
			{#each org.brands as brand (brand.brandId)}
				<Button variant={data.preference.lastBrandId === brand.brandId ? 'default' : 'outline'} href={`/o/${encodeURIComponent(org.organisationSlug)}/${encodeURIComponent(brand.brandSlug)}`}>{brand.brandName}</Button>
			{:else}<p class="text-sm text-muted-foreground">You have no brand access here yet. An organisation owner can grant access.</p>{/each}
		</Card.Content>
		<Card.Footer><Button variant="ghost" href={`/o/${encodeURIComponent(org.organisationSlug)}/settings`}>Organisation settings</Button></Card.Footer>
	</Card.Root>
{:else}
	<Card.Root><Card.Header><Card.Title>Start with your own brand</Card.Title><Card.Description>Create a personal organisation, or accept an invitation sent to your email.</Card.Description></Card.Header><Card.Footer><form method="POST" action="?/personal"><Button type="submit">Create my brand</Button></form></Card.Footer></Card.Root>
{/each}
<Card.Root>
	<Card.Header><Card.Title>Create an organisation</Card.Title><Card.Description>For a business, a client or another group you manage.</Card.Description></Card.Header>
	<Card.Content>
		<form method="POST" action="?/create" class="flex flex-col gap-4">
			<fieldset class="flex flex-col gap-2"><Label for="org-name">Organisation name</Label><Input id="org-name" name="name" required maxlength={120} autocomplete="organization" /></fieldset>
			<fieldset class="flex flex-col gap-2"><Label for="org-slug">Organisation address</Label><Input id="org-slug" name="slug" required maxlength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="your-organisation" /><p class="text-sm text-muted-foreground">Lowercase letters, numbers and hyphens.</p></fieldset>
			<Button type="submit">Create organisation</Button>
		</form>
	</Card.Content>
</Card.Root>
