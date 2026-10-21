/**
 * Avatar state management store
 * Centralizes all avatar-related UI state and operations
 */

import { uploadAvatar, importAvatar, deleteAvatar } from '$lib/avatar/avatarService';
import { invalidateAll } from '$app/navigation';

export interface AvatarState {
	uploading: boolean;
	importing: boolean;
	deleting: boolean;
	error: string;
	dialogOpen: boolean;
}

export type AvatarAction = 'upload' | 'import' | 'delete';

/**
 * Create avatar state for a component
 * This function should be called inside a Svelte component
 */
export function createAvatarState() {
	// These will be reactive when used with $state in the component
	const state = {
		uploading: false,
		importing: false,
		deleting: false,
		error: '',
		dialogOpen: false
	};

	// Actions object that can be used with the state
	const actions = {
		/**
		 * Clear any existing error
		 */
		clearError() {
			state.error = '';
		},

		/**
		 * Open the avatar dialog
		 */
		openDialog() {
			state.error = '';
			state.dialogOpen = true;
		},

		/**
		 * Close the avatar dialog and clear errors
		 */
		closeDialog() {
			state.dialogOpen = false;
			state.error = '';
		},

		/**
		 * Set loading state for a specific action
		 */
		setLoading(action: AvatarAction, loading: boolean) {
			switch (action) {
				case 'upload':
					state.uploading = loading;
					break;
				case 'import':
					state.importing = loading;
					break;
				case 'delete':
					state.deleting = loading;
					break;
			}
		},

		/**
		 * Set error message and clear loading states
		 */
		setError(error: string) {
			state.error = error;
			state.uploading = false;
			state.importing = false;
			state.deleting = false;
		},

		/**
		 * Upload avatar from file
		 */
		async uploadFile(file: File, onSuccess?: (imageUrl: string) => void) {
			if (!file) return;

			state.error = '';
			actions.setLoading('upload', true);

			try {
				const result = await uploadAvatar(file);

				if (result.ok && result.image) {
					state.dialogOpen = false;
					onSuccess?.(result.image);
					await invalidateAll();
				} else {
					state.error = result.error || 'Failed to upload avatar';
				}
			} catch (error) {
				state.error = error instanceof Error ? error.message : 'Upload failed';
			} finally {
				actions.setLoading('upload', false);
			}
		},

		/**
		 * Import avatar from URL
		 */
		async importFromUrl(url: string, onSuccess?: (imageUrl: string) => void) {
			if (!url) return;

			state.error = '';
			actions.setLoading('import', true);

			try {
				const result = await importAvatar(url);

				if (result.ok && result.image) {
					state.dialogOpen = false;
					onSuccess?.(result.image);
					await invalidateAll();
				} else {
					state.error = result.error || 'Failed to import avatar';
				}
			} catch (error) {
				state.error = error instanceof Error ? error.message : 'Import failed';
			} finally {
				actions.setLoading('import', false);
			}
		},

		/**
		 * Delete current avatar
		 */
		async deleteCurrentAvatar(onSuccess?: () => void) {
			state.error = '';
			actions.setLoading('delete', true);

			try {
				const result = await deleteAvatar();

				if (result.ok) {
					state.dialogOpen = false;
					onSuccess?.();
					await invalidateAll();
				} else {
					state.error = result.error || 'Failed to delete avatar';
				}
			} catch (error) {
				state.error = error instanceof Error ? error.message : 'Delete failed';
			} finally {
				actions.setLoading('delete', false);
			}
		}
	};

	return {
		state,
		actions
	};
}
