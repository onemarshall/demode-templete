<!--
	AvatarManager component
	Handles all avatar-related UI and interactions
-->

<script lang="ts">
	import {
		Avatar,
		AvatarImage,
		AvatarFallback,
	} from "#lib/components/ui/avatar/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Badge } from "#lib/components/ui/badge/index.js";
	import { Camera } from "@lucide/svelte";
	import {
		getResizedAvatarUrl,
		getAvatarInitials,
	} from "#lib/components/profile/utils/avatar.js";
	import { createAvatarState } from "#lib/avatar/avatarStore.js";
	import AvatarSourceDialog, {
		type Props as AvatarSourceDialogProps,
	} from "#lib/components/profile/AvatarSourceDialog.svelte";
	import type { BetterAuthUser } from "#lib/components/profile/tabs/types.js";

	interface Props {
		user: BetterAuthUser;
		isSocialLoginOnly?: boolean;
		onAvatarUpdate?: (imageUrl: string) => void;
		onAvatarDelete?: () => void;
	}

	let {
		user,
		isSocialLoginOnly = false,
		onAvatarUpdate,
		onAvatarDelete,
	}: Props = $props();

	// Avatar state management
	const avatarStore = createAvatarState();
	const avatarState = $state(avatarStore.state);
	const { actions } = avatarStore;
	let fileInput: HTMLInputElement | null = $state(null);

	// Derived states
	const isLoading = $derived(
		avatarState.uploading || avatarState.importing || avatarState.deleting,
	);
	const isBusy = $derived(isLoading);

	// Dialog props for AvatarSourceDialog
	const dialogProps = $derived<AvatarSourceDialogProps>({
		get open() {
			return avatarState.dialogOpen;
		},
		onOpenChange: (open: boolean) => {
			if (open) {
				actions.openDialog();
			} else {
				actions.closeDialog();
			}
		},
		onUploadFile: triggerFilePicker,
		onImportUrl: (url: string) =>
			actions.importFromUrl(url, onAvatarUpdate),
		get isUploading() {
			return avatarState.uploading;
		},
		get isImporting() {
			return avatarState.importing;
		},
		uploadLabel: "Upload from device",
		importLabel: "Import from URL",
	});

	// Event handlers
	function triggerFilePicker() {
		actions.closeDialog();
		queueMicrotask(() => {
			fileInput?.click();
		});
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement | null;
		const file = input?.files?.[0];

		if (!file) return;

		await actions.uploadFile(file, onAvatarUpdate);

		// Clear the file input
		if (fileInput) {
			fileInput.value = "";
		}
	}

	async function handleDeleteAvatar() {
		await actions.deleteCurrentAvatar(onAvatarDelete);
	}

	function openDialog() {
		actions.openDialog();
	}
</script>

<!-- Avatar Display and Controls -->
<div class="flex items-center space-x-4">
	<div class="group relative">
		{#key user?.image || "no-image"}
			<Avatar class="h-20 w-20">
				{#if user?.image}
					<AvatarImage
						src={getResizedAvatarUrl(user.image, 160) || user.image}
						alt="Profile picture"
					/>
				{/if}
				<AvatarFallback class="text-lg">
					{getAvatarInitials(user?.name, user?.email)}
				</AvatarFallback>
			</Avatar>
		{/key}

		<!-- Hidden file input -->
		<input
			type="file"
			accept="image/*"
			bind:this={fileInput}
			onchange={handleFileUpload}
			class="hidden"
		/>

		{#if !isSocialLoginOnly}
			{#if user?.image}
				<!-- Delete button - shown on hover when image exists -->
				<Button
					type="button"
					variant="destructive"
					class="absolute right-0 bottom-0 h-8 w-8 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
					onclick={handleDeleteAvatar}
					disabled={isBusy}
					aria-busy={isBusy}
					title="Delete avatar"
				>
					<svg
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</Button>
			{:else}
				<!-- Upload button - shown on hover when no image -->
				<Button
					type="button"
					variant="secondary"
					class="absolute right-0 bottom-0 h-8 w-8 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
					onclick={triggerFilePicker}
					disabled={isBusy}
					aria-busy={isBusy}
					title="Add avatar"
				>
					{#if avatarState.uploading}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{:else}
						<Camera class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		{/if}
	</div>

	<!-- User info -->
	<div class="min-w-0 space-y-2">
		<h3 class="truncate text-lg font-medium">
			{user?.name || "No name set"}
		</h3>
		<div class="flex items-center space-x-2">
			<Badge variant={user?.emailVerified ? "default" : "secondary"}>
				{user?.emailVerified ? "Verified" : "Unverified"}
			</Badge>
		</div>
	</div>
</div>

<!-- Error display -->
{#if avatarState.error}
	<p class="text-destructive mt-2 text-sm">{avatarState.error}</p>
{/if}

<!-- Avatar source dialog -->
<AvatarSourceDialog {...dialogProps} />
