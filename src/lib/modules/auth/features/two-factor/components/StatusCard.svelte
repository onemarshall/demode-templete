<!-- src/lib/modules/auth/features/profile/components/security/TwoFactorManager/components/TwoFactorStatusCard.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { Shield, CheckCircle, XCircle, Key, Smartphone } from '@lucide/svelte';

	interface TwoFactorState {
		isEnabled: boolean;
		isEnabling: boolean;
		isDisabling: boolean;
		showSetupDialog: boolean;
		showPasswordDialog: boolean;
		showDisableDialog: boolean;
		totpUri: string;
		qrCodeDataUrl: string;
		backupCodes: string[];
		showBackupCodes: boolean;
		step: 'setup' | 'verify' | 'backup';
	}

	interface Props {
		twoFactorState: TwoFactorState;
		onEnable: () => void;
		onDisable: () => void;
		onGenerateBackupCodes: () => void;
	}

	let { twoFactorState, onEnable, onDisable, onGenerateBackupCodes }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Shield class="h-5 w-5" />
			Two-Factor Authentication
			{#if twoFactorState.isEnabled}
				<CheckCircle class="h-4 w-4 text-green-500" />
			{:else}
				<XCircle class="h-4 w-4 text-red-500" />
			{/if}
		</Card.Title>
		<Card.Description>
			{twoFactorState.isEnabled
				? 'Manage your two-factor authentication settings'
				: 'Add an extra layer of security to your account'}
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-4">
		{#if twoFactorState.isEnabled}
			<!-- Enabled State - Clean and Simple -->
			<div class="flex items-center justify-between">
				<div>
					<h4 class="font-medium">2FA is enabled</h4>
					<p class="text-muted-foreground text-sm">
						Your account is protected with two-factor authentication
					</p>
				</div>
				<Badge variant="success">Active</Badge>
			</div>

			<Separator />

			<div class="flex items-center justify-between">
				<div>
					<h4 class="font-medium">Backup Codes</h4>
					<p class="text-muted-foreground text-sm">
						Generate new backup codes for account recovery
					</p>
				</div>
				<Button variant="outline" size="sm" onclick={onGenerateBackupCodes}>
					<Key class="h-4 w-4" />
					Generate Codes
				</Button>
			</div>

			<Separator />

			<div class="flex items-center justify-between">
				<div>
					<h4 class="font-medium">Disable 2FA</h4>
					<p class="text-muted-foreground text-sm">
						Remove two-factor authentication from your account
					</p>
				</div>
				<Button variant="destructive" size="sm" onclick={onDisable}>Disable 2FA</Button>
			</div>
		{:else}
			<!-- Disabled State - Subtle and Clean -->
			<div class="flex items-center justify-between">
				<div>
					<h4 class="font-medium">2FA is disabled</h4>
					<p class="text-muted-foreground text-sm">
						Enable 2FA to add an extra layer of security to your account
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge variant="destructive" class="p-2 text-white">Not Active</Badge>
					<Button onclick={onEnable} disabled={twoFactorState.isEnabling} size="sm">
						<Smartphone class="h-4 w-4" />
						{twoFactorState.isEnabling ? 'Setting up...' : 'Enable 2FA'}
					</Button>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
