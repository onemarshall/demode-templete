<!-- src/lib/modules/auth/features/profile/components/security/TwoFactorManager/components/QRCodeSetupDialog.svelte -->
<script lang="ts">
	import * as Dialog from "#lib/components/ui/dialog/index.js";
	import * as Form from "#lib/components/ui/form/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import * as InputOTP from "#lib/components/ui/input-otp/index.js";
	import { PinInput } from "bits-ui";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { twoFactorVerificationSchema } from "../../../components/forms/schema.js";
	import { slide } from "svelte/transition";

	interface Props {
		open: boolean;
		twoFactorState: {
			step: "setup" | "verify" | "backup";
			qrCodeDataUrl: string;
			backupCodes: string[];
		};
		onComplete: () => void;
		onVerifyCode?: (code: string) => Promise<void>;
		onCopyBackupCodes?: () => void;
	}

	let {
		open,
		twoFactorState,
		onComplete,
		onVerifyCode,
		onCopyBackupCodes,
	}: Props = $props();

	// ✅ SUPERFORMS: Verification code form
	const verificationForm = superForm(
		{ code: "" },
		{
			validators: zod4Client(twoFactorVerificationSchema),
			SPA: true,
			invalidateAll: false,
			onSubmit: async ({ formData, cancel }) => {
				cancel();
				const code = formData.get("code") as string;
				if (onVerifyCode) {
					await onVerifyCode(code);
				}
			},
		},
	);

	const { form: verificationFormData, enhance: verificationEnhance } =
		verificationForm;

	function handleStepChange(newStep: "setup" | "verify" | "backup") {
		twoFactorState.step = newStep;
	}

	function copyBackupCodes() {
		if (onCopyBackupCodes) {
			onCopyBackupCodes();
		} else {
			const codesText = twoFactorState.backupCodes.join("\n");
			navigator.clipboard.writeText(codesText);
		}
	}
</script>

<Dialog.Root {open} onOpenChange={onComplete}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Set up Two-Factor Authentication</Dialog.Title>
			<Dialog.Description>
				{#if twoFactorState.step === "setup"}
					Scan the QR code with your authenticator app
				{:else if twoFactorState.step === "verify"}
					Enter the verification code from your authenticator app
				{:else}
					Save your backup codes in a secure location
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			{#if twoFactorState.step === "setup"}
				<div class="space-y-5 text-center">
					{#if twoFactorState.qrCodeDataUrl}
						<img
							src={twoFactorState.qrCodeDataUrl}
							alt="2FA QR Code"
							class="mx-auto rounded border"
						/>
					{/if}
					<p class="text-muted-foreground text-sm">
						Scan this QR code with Google Authenticator, Authy, or
						another TOTP app
					</p>
					<Button onclick={() => handleStepChange("verify")}
						>I've scanned the code</Button
					>
				</div>
			{:else if twoFactorState.step === "verify"}
				<form use:verificationEnhance class="space-y-5">
					<Form.Field form={verificationForm} name="code">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label class="mt-3 mb-5"
									>Verification Code</Form.Label
								>
								<InputOTP.Root
									{...props}
									name="code"
									maxlength={6}
									bind:value={$verificationFormData.code}
									class="justify-center"
									aria-label="Enter 6-digit code"
								>
									{#snippet children({
										cells,
									}: {
										cells: PinInput.CellProps["cell"][];
									})}
										<InputOTP.Group>
											{#each cells.slice(0, 3) as cell (cell)}
												<InputOTP.Slot {cell} />
											{/each}
										</InputOTP.Group>
										<InputOTP.Separator />
										<InputOTP.Group>
											{#each cells.slice(3, 6) as cell (cell)}
												<InputOTP.Slot {cell} />
											{/each}
										</InputOTP.Group>
									{/snippet}
								</InputOTP.Root>
							{/snippet}
						</Form.Control>
						<Form.Description class="mt-5"
							>Enter the 6-digit code from your authenticator app</Form.Description
						>
						<Form.FieldErrors />
					</Form.Field>

					<div class="flex gap-2">
						<Button
							variant="outline"
							onclick={() => handleStepChange("setup")}
							>Back</Button
						>
						<Button type="submit" class="flex-1"
							>Verify & Enable</Button
						>
					</div>
				</form>
			{:else if twoFactorState.step === "backup"}
				<div class="space-y-4">
					<div
						class="rounded border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950"
					>
						<h4
							class="font-medium text-yellow-800 dark:text-yellow-200"
						>
							Save your backup codes
						</h4>
						<p
							class="mt-1 text-sm text-yellow-700 dark:text-yellow-300"
						>
							Store these codes in a safe place. You can use them
							to access your account if you lose your phone.
						</p>
					</div>

					<div
						class="rounded bg-gray-50 p-4 font-mono text-sm dark:bg-gray-900"
					>
						{#each twoFactorState.backupCodes as code}
							<div>{code}</div>
						{/each}
					</div>

					<div class="flex gap-2">
						<Button variant="outline" onclick={copyBackupCodes}
							>Copy Codes</Button
						>
						<Button onclick={onComplete} class="flex-1"
							>I've saved the codes</Button
						>
					</div>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
