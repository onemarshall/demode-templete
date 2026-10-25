<script lang="ts">
	import { fork, type Fork } from 'svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

	// Use the same feature flag as SvelteKit's client-side preloader.

	let showAccount = $state(false);
	let pending: Fork | undefined;

	function preload() {
		if (__SVELTEKIT_FORK_PRELOADS__) {
			pending = fork(() => { showAccount = true; });
		}
	}

	async function navigate() {
		if (pending) await pending.commit();
		else showAccount = true;
	}
</script>

<button onclick={preload}>Preload</button>
<button onclick={navigate}>Navigate</button>
{#if showAccount}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger aria-label="Account menu">
			<Avatar.Root>
				<Avatar.Image alt="Test account" />
				<Avatar.Fallback>TA</Avatar.Fallback>
			</Avatar.Root>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			<DropdownMenu.Group>
				<DropdownMenu.Item>Billing</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
