<script lang="ts">
	/** The finished-contract screen: link first, page below, no email gate. */
	import { Button } from '$lib/components/ui/button';
	import { ClockIcon, ShieldCheckIcon } from '@lucide/svelte';
	import CopyLink from './copy-link.svelte';
	import ContractPage from './contract-page.svelte';
	import LeaveGuard from './leave-guard.svelte';
	import { formatDate } from '$lib/app/components/montsel/format';
	import type { ContractContent } from '../shared/generate.js';
	import type { ProjectContext } from '../shared/types.js';

	let {
		publicId,
		publicUrl,
		saveUrl = null,
		content,
		context,
		confirmedAt,
		claim = null,
		emailLocked = false
	}: {
		publicId: string;
		publicUrl: string;
		saveUrl?: string | null;
		content: ContractContent;
		context: ProjectContext;
		confirmedAt: string;
		/** Null once the contract belongs to an account: there is nothing to claim. */
		claim?: { href: string; expiresAt: string | null; signedIn: boolean } | null;
		/** True when emailing is unavailable because the contract is not saved yet. */
		emailLocked?: boolean;
	} = $props();

	const signUpHref = $derived(
		`/auth/sign-up?redirectTo=${encodeURIComponent(claim?.href ?? '/')}`
	);
	const signInHref = $derived(
		`/auth/sign-in?redirectTo=${encodeURIComponent(claim?.href ?? '/')}`
	);
</script>

{#if claim}
	<LeaveGuard active />
{/if}

<div class="flex flex-col gap-8">
	{#if claim}
		<section
			class="border-foreground/20 bg-muted/40 flex flex-col gap-4 rounded-xl border p-6"
			aria-labelledby="keep-heading"
		>
			<div class="flex items-start gap-3">
				<ShieldCheckIcon class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
				<div class="flex flex-col gap-1">
					<h2 id="keep-heading" class="text-lg font-semibold">Keep this contract</h2>
					<p class="text-muted-foreground max-w-xl text-sm">
						Right now this link works
						{#if claim.expiresAt}
							until <strong>{formatDate(claim.expiresAt)}</strong>{:else}for a limited time{/if},
						and then it stops opening.
					</p>
					<p class="text-muted-foreground max-w-xl text-sm">
						Save it to a free account and it stays live, it appears in your documents, and you can
						come back and change a choice later.
					</p>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				{#if claim.signedIn}
					<form method="POST" action={claim.href}>
						<Button type="submit">Save to my account</Button>
					</form>
				{:else}
					<Button href={signUpHref}>Create a free account</Button>
					<Button variant="outline" href={signInHref}>I already have an account</Button>
				{/if}
			</div>

			<p class="text-muted-foreground flex items-center gap-1.5 text-xs">
				<ClockIcon class="size-3.5" aria-hidden="true" />
				The link works without an account until then. Saving is optional.
			</p>
		</section>
	{/if}

	<section class="flex flex-col gap-3 rounded-xl border p-6">
		<h1 class="text-2xl font-semibold">Your Visual Contract is ready</h1>
		<p class="text-muted-foreground max-w-xl text-sm">
			This link opens the finished page. Anyone with the link can read it. It does not let them
			change it.
		</p>
		<CopyLink value={publicUrl} />
		<div class="flex flex-wrap items-center gap-3">
			<Button href={`/contract/${publicId}`}>Open the page</Button>
			{#if saveUrl && claim}
				<Button variant="ghost" href={saveUrl}>Save my progress link</Button>
			{/if}
		</div>
		{#if saveUrl && claim}
			<p class="text-muted-foreground text-xs">
				Bookmark the save link to come back and change a choice. It only works in this browser.
			</p>
		{/if}
	</section>

	<section class="rounded-xl border p-6">
		<ContractPage {content} {context} {confirmedAt} {publicId} />
	</section>

	{#if emailLocked}
		<section class="flex flex-col gap-2 rounded-xl border border-dashed p-6">
			<h2 class="text-lg font-semibold">Send it to your designer</h2>
			<p class="text-muted-foreground max-w-xl text-sm">
				We only send links that will still open. An unsaved link stops working, so emailing it
				would leave your designer with a dead page.
			</p>
			<p class="text-muted-foreground max-w-xl text-sm">
				Save the contract to a free account and you can email it straight from your workspace.
			</p>
		</section>
	{/if}
</div>
