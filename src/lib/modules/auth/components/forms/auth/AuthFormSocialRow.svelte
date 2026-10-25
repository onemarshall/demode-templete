<script lang="ts">
	import { authClient } from "../../../client/client.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Separator } from "#lib/components/ui/separator/index.js";
	import { logger } from "#lib/platform/logger.js";
	import Github from "#lib/components/icons/Github.svelte";
	import Google from "#lib/components/icons/Google.svelte";
	import { Loader } from "@lucide/svelte";
	import type { Component, Snippet } from "svelte";

	type SocialProvider = {
		name: string;
		provider: "github" | "google";
		icon: Component<{ size?: number }>;
	};

	type Props = {
		/** Callback URL passed to `authClient.signIn.social`. Default: '/auth/profile' */
		callbackURL?: string;
		/** Override the default GitHub + Google list. */
		providers?: SocialProvider[];
		/** Disable all buttons (e.g. while another form action is in progress). */
		disabled?: boolean;
		/** Whether to render the "Or continue with" separator below the row. */
		showSeparator?: boolean;
		/** Custom separator label. Default: "Or continue with". */
		separatorLabel?: string;
		/** Optional content rendered above the social row (e.g. a passkey button). */
		topSlot?: Snippet;
		/** Provider id that was last used to sign in (shows a badge). */
		lastUsedProvider?: string | null;
	};

	const DEFAULT_PROVIDERS: SocialProvider[] = [
		{ name: "GitHub", provider: "github", icon: Github },
		{ name: "Google", provider: "google", icon: Google },
	];

	let {
		callbackURL = "/auth/profile",
		providers = DEFAULT_PROVIDERS,
		disabled = false,
		showSeparator = true,
		separatorLabel = "Or continue with",
		topSlot,
		lastUsedProvider = null,
	}: Props = $props();

	let loadingProvider = $state<string | null>(null);

	async function handleSocialLogin(provider: SocialProvider["provider"]) {
		try {
			loadingProvider = provider;
			const result = await authClient.signIn.social({
				provider,
				callbackURL,
			});
			if (result?.error) {
				logger.error(
					`[${provider}] social sign-in error`,
					result.error,
				);
			}
		} catch (error) {
			logger.error(`[${provider}] social sign-in threw`, error);
		} finally {
			loadingProvider = null;
		}
	}
</script>

{#if topSlot}
	{@render topSlot()}
{/if}

<div class="grid gap-2">
	{#each providers as social (social.provider)}
		{@const isLoading = loadingProvider === social.provider}
		<Button
			type="button"
			variant="outline"
			class="w-full"
			onclick={() => handleSocialLogin(social.provider)}
			disabled={disabled || loadingProvider !== null}
		>
			<div class="flex w-full items-center justify-center gap-2">
				{#if isLoading}
					<Loader class="h-4 w-4 animate-spin" />
				{:else}
					<social.icon size={16} />
				{/if}
				<span>Continue with {social.name}</span>
				{#if lastUsedProvider === social.provider}
					<span
						class="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
					>
						Last used
					</span>
				{/if}
			</div>
		</Button>
	{/each}
</div>

{#if showSeparator}
	<div class="relative">
		<div class="absolute inset-0 flex items-center">
			<Separator class="w-full" />
		</div>
		<div class="relative flex justify-center text-xs uppercase">
			<span class="bg-card text-muted-foreground px-2"
				>{separatorLabel}</span
			>
		</div>
	</div>
{/if}
