<!-- Avatar display and management section -->
<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { getResizedAvatarUrl, getAvatarInitials } from '$lib/components/profile/utils/avatar';
	import { invalidateAll } from '$app/navigation';
	import type { BetterAuthUser } from '$lib/components/profile/tabs/types';
	import AvatarSourceDialog, {
		type Props as AvatarSourceDialogProps
	} from '$lib/components/profile/AvatarSourceDialog.svelte';

	interface Props {
		user: BetterAuthUser;
		isSocialLoginOnly?: boolean;
		isUploading?: boolean;
		isImporting?: boolean;
		error?: string;
		onAvatarChange?: (imageUrl: string) => void;
		onAvatarDelete?: () => void;
	}

	let {
		user,
		isSocialLoginOnly = false,
		isUploading = false,
		isImporting = false,
		error = '',
		onAvatarChange,
		onAvatarDelete
	}: Props = $props();

	let showAvatarDialog = $state(false);
	let avatarUploadError = $state('');
	let avatarInput: HTMLInputElement | null = null;

	// Keep local error in sync with prop updates
	$effect(() => {
		avatarUploadError = error ?? '';
	});

	// Clear error on mount and when component updates
	$effect(() => {
		const timer = setTimeout(() => {
			if (avatarUploadError) {
				avatarUploadError = '';
			}
		}, 0);
		return () => clearTimeout(timer);
	});

	const avatarDialogProps = $derived<AvatarSourceDialogProps>({
		get open() {
			return showAvatarDialog;
		},
		onOpenChange: (open) => {
			showAvatarDialog = open;
		},
		onUploadFile: triggerAvatarFilePicker,
		onImportUrl: handleAvatarImport,
		get isUploading() {
			return isUploading;
		},
		get isImporting() {
			return isImporting;
		},
		uploadLabel: 'Upload from device',
		importLabel: 'Import from URL'
	});

	function triggerAvatarFilePicker() {
		avatarInput?.click();
	}

	function handleAvatarDialogChange(open: boolean) {
		showAvatarDialog = open;
	}

	async function handleAvatarUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('?/uploadAvatar', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok && result?.data?.image) {
				onAvatarChange?.(result.data.image);
				showAvatarDialog = false;
				await invalidateAll();
			} else {
				avatarUploadError = result?.data?.error || 'Failed to upload avatar';
			}
		} catch (err) {
			avatarUploadError = err instanceof Error ? err.message : 'Upload failed';
		}
	}

	async function handleAvatarImport(url: string) {
		try {
			const response = await fetch('?/importAvatar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});

			const result = await response.json();

			if (response.ok && result?.data?.image) {
				onAvatarChange?.(result.data.image);
				showAvatarDialog = false;
				await invalidateAll();
			} else {
				avatarUploadError = result?.data?.error || 'Failed to import avatar';
			}
		} catch (err) {
			avatarUploadError = err instanceof Error ? err.message : 'Import failed';
		}
	}

	async function handleDeleteAvatar() {
		if (!user?.image) return;

		try {
			const formData = new FormData();
			const response = await fetch('?/deleteAvatar', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok) {
				onAvatarDelete?.();
				showAvatarDialog = false;
				await invalidateAll();
			} else {
				avatarUploadError = result?.data?.error || 'Failed to delete avatar';
			}
		} catch (err) {
			avatarUploadError = err instanceof Error ? err.message : 'Delete failed';
		}
	}
</script>

<div class="flex items-center space-x-4">
	<div class="group relative">
		{#key user?.image || 'no-image'}
			<Avatar class="h-20 w-20">
				{#if user?.image}
					<AvatarImage
						src={getResizedAvatarUrl(user.image, 300) || user.image}
						alt="Profile picture"
						onload={() => {}}
						onerror={() => {}}
					/>
				{/if}
				<AvatarFallback class="text-lg">
					{getAvatarInitials(user?.name, user?.email)}
				</AvatarFallback>
			</Avatar>
		{/key}
		<input
			class="hidden"
			type="file"
			accept="image/*"
			bind:this={avatarInput}
			onchange={handleAvatarUpload}
		/>
		{#if !isSocialLoginOnly}
			{#if user?.image}
				<!-- Delete button - shown on hover when image exists -->
				<Button
					type="button"
					variant="destructive"
					class="absolute right-0 bottom-0 h-8 w-8 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
					onclick={handleDeleteAvatar}
					disabled={isUploading || isImporting}
					title="Delete avatar"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					onclick={() => (showAvatarDialog = true)}
					disabled={isUploading || isImporting}
					title="Upload avatar"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</Button>
			{/if}
		{/if}
	</div>

	<div class="flex-1">
		<p class="text-sm font-medium">{user?.name || 'User'}</p>
		<p class="text-muted-foreground text-xs">{user?.email}</p>
		{#if avatarUploadError}
			<p class="mt-1 text-xs text-red-500">{avatarUploadError}</p>
		{/if}
	</div>

	<AvatarSourceDialog {...avatarDialogProps} />
</div>
