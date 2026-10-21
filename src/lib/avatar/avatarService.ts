/**
 * Avatar service - handles all avatar-related API operations
 * Uses a dedicated API endpoint instead of SvelteKit form actions
 */

export interface AvatarServiceResult {
	ok: boolean;
	image?: string;
	error?: string;
}

/**
 * Upload avatar from file
 */
export async function uploadAvatar(file: File): Promise<AvatarServiceResult> {
	try {
		const formData = new FormData();
		formData.append('avatar', file, file.name);

		const response = await fetch('/auth/profile/avatar', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Upload failed');
			return { ok: false, error: errorText };
		}

		const data = await response.json();
		return { ok: true, image: data.image };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Network error occurred'
		};
	}
}

/**
 * Import avatar from URL (fetches URL server-side and uploads)
 */
export async function importAvatar(url: string): Promise<AvatarServiceResult> {
	try {
		// Fetch the image client-side and upload as file
		const response = await fetch(url);
		if (!response.ok) {
			return { ok: false, error: 'Failed to fetch image URL' };
		}
		const blob = await response.blob();
		const file = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' });
		return uploadAvatar(file);
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Import failed'
		};
	}
}

/**
 * Delete current avatar
 */
export async function deleteAvatar(): Promise<AvatarServiceResult> {
	try {
		const response = await fetch('/auth/profile/avatar', {
			method: 'DELETE'
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Delete failed');
			return { ok: false, error: errorText };
		}

		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : 'Network error occurred'
		};
	}
}
