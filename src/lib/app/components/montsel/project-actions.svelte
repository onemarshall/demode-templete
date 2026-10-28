<script lang="ts">
	/**
	 * Row actions for a saved Visual Contract.
	 *
	 * The three dots open a menu rather than navigating straight to the contract,
	 * and deleting asks first — the shareable link stops working, so it is not
	 * something to do by mis-click.
	 */
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpRightIcon, MoreHorizontalIcon, TrashIcon } from '@lucide/svelte';

	let {
		title,
		href,
		draftId,
		action = '?/delete'
	}: {
		title: string;
		href: string;
		draftId: string;
		/** Form action URL for the delete handler. */
		action?: string;
	} = $props();

	let confirming = $state(false);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon-sm" aria-label={`Actions for ${title}`}>
				<MoreHorizontalIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-40">
		<DropdownMenu.Item>
			{#snippet child({ props })}
				<!-- No extra class here: `props` already carries the item's sizing.
				     A class after the spread would replace it and break the row height. -->
				<a {...props} {href}>
					<ArrowUpRightIcon />
					Open
				</a>
			{/snippet}
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item variant="destructive" onSelect={() => (confirming = true)}>
			<TrashIcon />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<AlertDialog.Root bind:open={confirming}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this contract?</AlertDialog.Title>
			<AlertDialog.Description>
				“{title}” will be removed and its shareable link will stop working. Anyone you have sent
				it to will no longer be able to open it. This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex items-center justify-end gap-2">
			<AlertDialog.Cancel>Keep it</AlertDialog.Cancel>
			<form method="POST" {action}>
				<input type="hidden" name="draftId" value={draftId} />
				<Button type="submit" variant="destructive">Delete contract</Button>
			</form>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
