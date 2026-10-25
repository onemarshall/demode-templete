<!-- src/lib/modules/auth/components/CodeInput.svelte -->
<script lang="ts">
	import { Input } from "#lib/components/ui/input/index.js";
	import * as InputOTP from "#lib/components/ui/input-otp/index.js";
	import { PinInput } from "bits-ui";

	type VerificationMethod = "totp" | "otp" | "backup";

	let {
		method,
		otpValue = $bindable(),
		backupCodeValue = $bindable(),
		disabled = false,
	}: {
		method: VerificationMethod;
		otpValue: string;
		backupCodeValue: string;
		disabled: boolean;
	} = $props();
</script>

<div class="space-y-2">
	<label for="code" class="block text-center text-sm font-medium">
		{method === "backup" ? "Backup Code" : "Verification Code"}
	</label>

	<div class="flex justify-center py-4">
		{#if method === "backup"}
			<!-- Regular Input for Backup Codes -->
			<Input
				type="text"
				bind:value={backupCodeValue}
				placeholder="Enter backup code"
				maxlength={16}
				class="max-w-xs text-center font-mono text-lg tracking-widest"
				{disabled}
				autocomplete="one-time-code"
				aria-label="Backup code"
			/>
		{:else}
			<!-- InputOTP for TOTP/OTP -->
			<InputOTP.Root maxlength={6} bind:value={otpValue} {disabled}>
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
		{/if}
	</div>

	<p class="text-muted-foreground text-center text-sm">
		{#if method === "totp"}
			Open your authenticator app and enter the 6-digit code
		{:else if method === "otp"}
			Check your email for the 6-digit verification code
		{:else}
			Use one of your saved backup codes
		{/if}
	</p>
</div>
