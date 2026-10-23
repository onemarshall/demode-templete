<script lang="ts">
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import DeleteUserForm from '#lib/components/forms/DeleteUserForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let exportPending = $state(false);
	let exportError = $state('');
	let exportNotice = $state('');
	let exportNeedsSignIn = $state(false);
	const joinedDate = $derived(new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(data.user.createdAt)));

	async function downloadAccountData() {
		exportPending = true;
		exportError = '';
		exportNotice = '';
		exportNeedsSignIn = false;
		try {
			const response = await fetch('/auth/account/export', { credentials: 'same-origin', cache: 'no-store' });
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				exportError = typeof body.error === 'string' ? body.error : 'Your account data could not be prepared. Please try again later.';
				exportNeedsSignIn = response.status === 401 || response.status === 403;
				return;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `account-data-${new Date().toISOString().slice(0, 10)}.json`;
			link.hidden = true;
			document.body.append(link);
			link.click();
			exportNotice = 'Download prepared. Check your downloads.';
			window.setTimeout(() => {
				URL.revokeObjectURL(url);
				link.remove();
			}, 60_000);
		} catch {
			exportError = 'Your account data could not be prepared. Please try again later.';
		} finally {
			exportPending = false;
		}
	}
</script>

<svelte:head><title>Account &amp; privacy</title></svelte:head>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="Account & privacy" description="Review your account details and manage account deletion." />

	<Card.Root>
		<Card.Header>
			<Card.Title>Account information</Card.Title>
			<Card.Description>Your account details for this app.</Card.Description>
		</Card.Header>
		<Card.Content>
			<dl class="grid gap-5 sm:grid-cols-2">
				<div class="flex flex-col gap-1"><dt class="text-muted-foreground text-sm">Email address</dt><dd class="break-all">{data.user.email}</dd></div>
				<div class="flex flex-col gap-1"><dt class="text-muted-foreground text-sm">Email verification</dt><dd><Badge variant="secondary">{data.user.emailVerified ? 'Verified' : 'Not verified'}</Badge></dd></div>
				<div class="flex flex-col gap-1"><dt class="text-muted-foreground text-sm">Member since</dt><dd>{joinedDate}</dd></div>
				<div class="flex flex-col gap-1"><dt class="text-muted-foreground text-sm">Account role</dt><dd>{data.roles.length ? data.roles.join(', ') : 'user'}</dd></div>
				<div class="flex flex-col gap-1 sm:col-span-2"><dt class="text-muted-foreground text-sm">Account ID</dt><dd class="break-all font-mono text-sm">{data.user.id}</dd></div>
			</dl>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Manage your account</Card.Title>
			<Card.Description>Profile details, sign-in methods and billing have their own settings.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-wrap gap-3">
			<Button href="/auth/profile" variant="outline">Edit profile</Button>
			<Button href="/auth/security" variant="outline">Sign-in &amp; security</Button>
			<Button href="/auth/billing" variant="outline">Subscription &amp; billing</Button>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Download your data</Card.Title>
			<Card.Description>Download profile details, up to 50 linked sign-in providers, 100 session device records and 100 recent subscription records held by this authentication app. Activity history is available under <a class="underline" href="/auth/activity">Security activity</a>. Data held by connected services is not included.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col items-start gap-3">
			<Button onclick={downloadAccountData} disabled={exportPending}>{exportPending ? 'Preparing download…' : 'Download account data'}</Button>
			{#if exportError}
				<p class="text-destructive text-sm" role="alert">{exportError}{#if exportNeedsSignIn} <a class="underline" href="/auth/sign-in">Sign in again</a>.{/if}</p>
			{/if}
			{#if exportNotice}<p class="text-muted-foreground text-sm" role="status">{exportNotice}</p>{/if}
			<p class="text-muted-foreground text-sm">For your security, you may need to sign in again if your session is more than an hour old.</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Delete account</Card.Title>
			<Card.Description>Review what happens before requesting account deletion.</Card.Description>
		</Card.Header>
		<Card.Content>
			<DeleteUserForm data={{ user: data.user, hasPassword: data.hasPassword, deletionEligibility: data.deletionEligibility }} />
		</Card.Content>
	</Card.Root>
</div>
