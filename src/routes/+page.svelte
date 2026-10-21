<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	const session = authClient.useSession();

	const user = $derived($session.data?.user ?? null);
	const isAuthenticated = $derived(Boolean(user));

	async function handleSignOut() {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					goto('/auth/sign-in');
				}
			}
		});
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
	{#if isAuthenticated}
		<section class="grid gap-6 md:grid-cols-[minmax(280px,320px),1fr]">
			<Card class="border-muted bg-card">
				<CardHeader>
					<CardTitle class="text-xl">Welcome back</CardTitle>
					<CardDescription>Your account details</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="flex items-center gap-3">
						<Avatar.Root>
							<Avatar.Image src={user?.image ?? undefined} alt={user?.name ?? 'User avatar'} />
							<Avatar.Fallback>
								{user?.name?.at(0) ?? '?'}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="space-y-1">
							<p class="text-sm font-medium">{user?.name}</p>
							<p class="text-muted-foreground text-sm">{user?.email}</p>
						</div>
					</div>
				</CardContent>
				<CardFooter class="flex flex-col gap-2 sm:flex-row sm:justify-between">
					<Button variant="outline" href="/auth/profile" class="w-full sm:w-auto"
						>Manage profile</Button
					>
					<Button variant="ghost" onclick={handleSignOut} class="w-full sm:w-auto">Sign out</Button>
				</CardFooter>
			</Card>

			<Card class="border-muted bg-card">
				<CardHeader>
					<CardTitle class="text-xl">Next steps</CardTitle>
					<CardDescription>Quick actions to explore the dashboard</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border border-dashed p-4">
						<h3 class="text-sm font-medium">Invite teammates</h3>
						<p class="text-muted-foreground text-sm">Share access with your team to collaborate.</p>
						<Button variant="outline" class="mt-3">Send invites</Button>
					</div>
					<div class="rounded-lg border border-dashed p-4">
						<h3 class="text-sm font-medium">Review security</h3>
						<p class="text-muted-foreground text-sm">
							Set up passkeys and two-factor authentication.
						</p>
						<Button variant="outline" href="/auth/profile/security" class="mt-3"
							>Review settings</Button
						>
					</div>
				</CardContent>
			</Card>
		</section>
	{:else}
		<section class="grid gap-10 lg:grid-cols-[minmax(280px,360px),1fr]">
			<Card class="border-muted bg-card">
				<CardHeader>
					<CardTitle class="text-xl">Get started</CardTitle>
					<CardDescription>Create an account to access the dashboard.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<p class="text-muted-foreground text-sm">
						Choose a sign-up option and you’ll be in the dashboard in moments.
					</p>
					<Button class="w-full" href="/auth/sign-up">Create account</Button>
					<Button variant="outline" class="w-full" href="/auth/sign-in">Sign in instead</Button>
				</CardContent>
			</Card>

			<Card class="border-muted bg-card">
				<CardHeader>
					<CardTitle class="text-xl">Why join?</CardTitle>
					<CardDescription
						>Your account unlocks analytics, security tools, and more.</CardDescription
					>
				</CardHeader>
				<CardContent class="text-muted-foreground space-y-4 text-sm">
					<ul class="space-y-2">
						<li>• Email and social sign-up options using our Better Auth integration.</li>
						<li>• Secure dashboard built on Bun + SvelteKit.</li>
						<li>• Manage sessions, passkeys, and last login methods from one place.</li>
					</ul>
				</CardContent>
			</Card>
		</section>
	{/if}
</div>
