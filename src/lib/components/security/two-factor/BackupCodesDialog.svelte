<!-- src/lib/components/profile/security/TwoFactorManager/components/BackupCodesDialog.svelte -->
<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		codes: string[];
		onClose: () => void;
	}

	let { open, codes, onClose }: Props = $props();

	function copyBackupCodes() {
		const codesText = codes.join('\n');
		navigator.clipboard.writeText(codesText);
		toast.success('Backup codes copied to clipboard');
	}
</script>

<Dialog.Root {open} onOpenChange={onClose}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Backup Codes</Dialog.Title>
			<Dialog.Description>
				Use these codes to access your account if you lose your authenticator device.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="rounded bg-gray-50 p-4 font-mono text-sm dark:bg-gray-900">
				{#each codes as code}
					<div>{code}</div>
				{/each}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={copyBackupCodes}>Copy Codes</Button>
			<Button onclick={onClose}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
