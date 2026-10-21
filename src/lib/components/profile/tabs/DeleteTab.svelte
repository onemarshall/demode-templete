<!-- src/lib/components/profile/DeleteTab.svelte -->
<script lang="ts">
	import DeleteUserForm from '#lib/components/forms/DeleteUserForm.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { AlertTriangle } from '@lucide/svelte';

	interface Props {
		user: any;
	}

	let { user }: Props = $props();
</script>

<Card.Root class="border-destructive/20">
	<Card.Header>
		<Card.Title class="text-destructive flex items-center gap-2">
			<AlertTriangle class="h-5 w-5" />
			Delete Account
		</Card.Title>
		<Card.Description>Permanently delete your account and all associated data.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<Alert variant="destructive">
			<AlertTriangle class="h-4 w-4" />
			<AlertDescription>
				<strong>Warning:</strong> This action cannot be undone. This will permanently delete your account
				and remove your data from our servers.
			</AlertDescription>
		</Alert>

		<div class="space-y-2">
			<h4 class="font-medium">What will be deleted:</h4>
			<ul class="text-muted-foreground space-y-1 text-sm">
				<li>• Your profile information and settings</li>
				<li>• All your sessions and login history</li>
				<li>• Connected social accounts</li>
				<li>• Two-factor authentication settings</li>
				<li>• All passkeys and security keys</li>
			</ul>
		</div>

		<DeleteUserForm data={{ user }} />
	</Card.Content>
</Card.Root>
