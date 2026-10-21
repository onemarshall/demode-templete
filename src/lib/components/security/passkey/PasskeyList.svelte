<!-- src/lib/components/profile/security/PasskeyManager/components/PasskeyList.svelte -->
<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { KeyRound } from '@lucide/svelte';
	import PasskeyItem from './PasskeyItem.svelte';
	import type { Passkey } from '@better-auth/passkey';

	interface Props {
		passkeys: Passkey[];
		disabled?: boolean;
		onRemove?: (passkeyId: string) => Promise<void>;
		onPasskeyDeleted: () => Promise<void>;
		messages: { error: string | null; success: string | null };
	}

	let {
		passkeys,
		disabled = false,
		onRemove,
		onPasskeyDeleted,
		messages = $bindable()
	}: Props = $props();

	let deletingPasskeyId = $state<string | null>(null);
</script>

{#if passkeys.length > 0}
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Your Passkeys</h3>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				{passkeys.length} passkey{passkeys.length !== 1 ? 's' : ''} saved
			</span>
		</div>
		<div class="space-y-2">
			{#each passkeys as passkey, index}
				<PasskeyItem
					{passkey}
					{index}
					{disabled}
					{onRemove}
					{onPasskeyDeleted}
					bind:deletingPasskeyId
					bind:messages
				/>
			{/each}
		</div>
	</div>
{:else}
	<div class="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
		<KeyRound class="mx-auto mb-2 h-8 w-8 text-gray-400" />
		<p class="mb-1 text-sm text-gray-500">No passkeys saved yet</p>
		<p class="text-xs text-gray-400">
			Create your first passkey to enable secure, passwordless authentication
		</p>
	</div>
{/if}
