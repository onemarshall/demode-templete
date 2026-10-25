<!-- src/lib/modules/auth/features/profile/components/GeneralTab.svelte -->
<script lang="ts">
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { profileSchema } from "../../../../components/forms/schema.js";
	import * as Card from "#lib/components/ui/card/index.js";
	import * as Form from "#lib/components/ui/form/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Input } from "#lib/components/ui/input/index.js";
	import { Badge } from "#lib/components/ui/badge/index.js";
	import { Separator } from "#lib/components/ui/separator/index.js";
	import { authClient } from "../../../../client/client.js";
	import { toast } from "svelte-sonner";
	import * as ImageCropper from "#lib/components/ui/image-cropper/index.js";
	import { getAvatarInitials } from "../../../avatar/shared/utils.js";
	import { uploadAvatar, deleteAvatar } from "../../../avatar/client/avatarService.js";
	import { logger } from "#lib/platform/logger.js";
	import type { GeneralTabProps } from "./types";

	type Props = GeneralTabProps & {
		isSiweLogin?: boolean;
	};

	let {
		user: initialUser,
		form: formData,
		isSocialLoginOnly = false,
		isSiweLogin = false,
	}: Props = $props();

	// Use derived state instead of copying the prop
	const user = $derived(initialUser);

	let isUpdating = $state(false);
	let isUploadingAvatar = $state(false);
	// Image cropper state
	let avatarSrc = $state("");

	// Keep avatar src in sync with user image
	$effect(() => {
		avatarSrc = user?.image || "";
	});

	// Form for profile updates. superForm must be instantiated once — wrapping it
	// in $derived creates a new instance (with the same auto-generated data id)
	// whenever `formData` changes, which triggers the duplicate-id warning.
	// Incoming data is synced via the $effect below instead.
	// svelte-ignore state_referenced_locally
	const form = superForm(formData, {
		id: "profile-general",
		validators: zod4Client(profileSchema),
		SPA: true,
		onSubmit: async ({ formData: submitData, cancel }) => {
			cancel();
			isUpdating = true;
			try {
				const newName = submitData.get("name") as string;

				// Only update name - don't touch image (it's managed separately via avatar upload/delete)
				const result = await authClient.updateUser({
					name: newName,
				});
				if (result.error) throw new Error(result.error.message || "Unable to update your profile.");

				// Update form store to match the new values
				$formStore.name = newName;
				initialUser = { ...initialUser, name: newName };
				toast.success("Profile updated.");
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Unable to update your profile.");
			} finally {
				isUpdating = false;
			}
		},
	});

	const formStore = form.form;
	const enhance = form.enhance;

	// Keep form data in sync when parent updates it
	$effect(() => {
		form.form.set(formData.data);
	});

	async function applyAvatarImage(imageUrl: string) {
		$formStore.image = imageUrl;
		avatarSrc = imageUrl;
		initialUser = { ...initialUser, image: imageUrl };
	}

	async function handleAvatarCropped(imageUrl: string) {
		try {
			isUploadingAvatar = true;

			// Convert blob/data URL to File
			const response = await fetch(imageUrl);
			const blob = await response.blob();
			const file = new File([blob], "avatar.png", {
				type: blob.type || "image/png",
			});

			const result = await uploadAvatar(file);

			if (result.ok && result.image) {
				await applyAvatarImage(result.image);
				toast.success("Avatar updated successfully");
			} else {
				toast.error(result.error || "Failed to upload avatar.");
			}
		} catch (error) {
			logger.error("Avatar upload error:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to process avatar.",
			);
		} finally {
			isUploadingAvatar = false;
		}
	}

	async function handleDeleteAvatar() {
		if (!user?.image) return;

		isUploadingAvatar = true;

		try {
			const result = await deleteAvatar();

			if (result.ok) {
				initialUser = { ...initialUser, image: null };
				$formStore.image = "";
				avatarSrc = "";
				toast.success("Avatar deleted successfully");
			} else {
				toast.error(result.error || "Failed to delete avatar.");
			}
		} catch (error) {
			logger.error("Delete avatar error:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to delete avatar.",
			);
		} finally {
			isUploadingAvatar = false;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Profile Information</Card.Title>
		<Card.Description
			>Update your profile information and avatar.</Card.Description
		>
	</Card.Header>
	<Card.Content class="space-y-6">
		<!-- Avatar Section -->
		<div class="flex items-center space-x-4">
			<div class="relative">
				{#key avatarSrc}
					<ImageCropper.Root
						bind:src={avatarSrc}
						onUnsupportedFile={(file) => {
							toast.error(`Unsupported file type: ${file.type}`);
						}}
						onCropped={handleAvatarCropped}
					>
						<ImageCropper.UploadTrigger>
							<ImageCropper.Preview>
								{#snippet child({ src })}
									<div
										class="h-20 w-20 rounded-full overflow-hidden bg-muted"
									>
										{#if src}
											<img
												{src}
												alt=""
												class="h-full w-full object-cover"
											/>
										{:else}
											<div
												class="h-full w-full flex items-center justify-center text-lg font-medium"
											>
												{getAvatarInitials(
													user?.name,
													user?.email,
												)}
											</div>
										{/if}
									</div>
								{/snippet}
							</ImageCropper.Preview>
						</ImageCropper.UploadTrigger>
						<ImageCropper.Dialog>
							<ImageCropper.Cropper />
							<ImageCropper.Controls>
								<ImageCropper.Cancel />
								<ImageCropper.Crop
									disabled={isUploadingAvatar}
								/>
							</ImageCropper.Controls>
						</ImageCropper.Dialog>
					</ImageCropper.Root>
				{/key}
			</div>
			<div class="min-w-0 space-y-2">
				<h3 class="truncate text-lg font-medium">
					{user?.name || "No name set"}
				</h3>
				<div class="flex items-center space-x-2">
					<Badge
						variant={isSiweLogin || user?.emailVerified
							? "default"
							: "secondary"}
					>
						{isSiweLogin || user?.emailVerified
							? "Verified"
							: "Unverified"}
					</Badge>
				</div>
			</div>
		</div>

		<Separator />

		<!-- Profile Form -->
		<form use:enhance class="space-y-4">
			<div
				class="grid {isSiweLogin ? 'grid-cols-1' : 'grid-cols-2'} gap-4"
			>
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Name</Form.Label>
							<Input
								{...props}
								value={$formStore.name}
								oninput={(e) =>
									($formStore.name = (
										e.target as HTMLInputElement
									).value)}
								placeholder="Enter your name"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description
						>This is your public display name.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				{#if !isSiweLogin}
					<Form.Field {form} name="email">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Email</Form.Label>
								<Input
									{...props}
									type="email"
									bind:value={$formStore.email}
									disabled
									class="opacity-50"
								/>
							{/snippet}
						</Form.Control>
						<Form.Description>
							Change your email in <a href="/auth/security" class="underline underline-offset-4">Sign-in &amp; security</a>.
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
				{/if}
			</div>

			<Button type="submit" disabled={isUpdating}>
				{isUpdating ? "Updating..." : "Update Profile"}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
