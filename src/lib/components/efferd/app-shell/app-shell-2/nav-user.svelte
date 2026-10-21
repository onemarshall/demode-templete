<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { authClient } from "#lib/auth-client.js";
	import { logger } from "#lib/auth/shared/logger.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import BadgeCheckIcon from "@lucide/svelte/icons/badge-check";
	import CreditCardIcon from "@lucide/svelte/icons/credit-card";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import type { ShellUser } from "./app-shared";

	let { user = null }: { user?: ShellUser | null } = $props();

	const displayName = $derived(user?.name || user?.email || "Account");
	const displayEmail = $derived(user?.email ?? "");
	const initials = $derived.by(() => {
		const source = user?.name || user?.email || "?";
		return source
			.split(/[\s@]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? "")
			.join("");
	});

	async function handleSignOut() {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						invalidateAll();
						goto("/auth/sign-in");
					}
				}
			});
		} catch (error) {
			logger.error("Sign out error:", error);
			await goto("/auth/sign-in");
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Avatar.Root class="size-8">
			<Avatar.Image src={user?.image ?? undefined} alt={displayName} />
			<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
		</Avatar.Root>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content
		class="w-(--bits-dropdown-menu-anchor-width) min-w-60 rounded-lg"
		align="end"
	>
		<DropdownMenu.Label class="p-0 font-normal">
			<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
				<Avatar.Root class="size-8 rounded-lg">
					<Avatar.Image src={user?.image ?? undefined} alt={displayName} />
					<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
				</Avatar.Root>
				<div class="grid flex-1 text-start text-sm leading-tight">
					<span class="truncate font-medium">{displayName}</span>
					<span class="truncate text-xs">{displayEmail}</span>
				</div>
			</div>
		</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Group>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a {...props} href="/auth/pricing">
						<SparklesIcon />
						Upgrade to Pro
					</a>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<DropdownMenu.Group>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a {...props} href="/auth/profile">
						<BadgeCheckIcon />
						Account
					</a>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a {...props} href="/subscribe">
						<CreditCardIcon />
						Billing
					</a>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Group>
		<DropdownMenu.Separator />
		<DropdownMenu.Item variant="destructive" onclick={handleSignOut}>
			<LogOutIcon />
			Log out
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
