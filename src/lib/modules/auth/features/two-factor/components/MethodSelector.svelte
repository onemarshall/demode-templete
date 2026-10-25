<!-- src/lib/modules/auth/components/VerificationMethodSelector.svelte -->
<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Smartphone, Mail, Key } from '@lucide/svelte';

	type VerificationMethod = 'totp' | 'otp' | 'backup';

	let {
		method = $bindable(),
		disabled = false,
		switchMethod
	}: {
		method: VerificationMethod;
		disabled: boolean;
		switchMethod: (method: VerificationMethod) => void;
	} = $props();
</script>

<div class="bg-muted flex rounded-lg p-1">
	<Button
		variant={method === 'totp' ? 'default' : 'ghost'}
		size="sm"
		class="flex-1"
		onclick={() => switchMethod('totp')}
		{disabled}
	>
		<Smartphone class="mr-1 h-3 w-3" />
		App
	</Button>
	<Button
		variant={method === 'otp' ? 'default' : 'ghost'}
		size="sm"
		class="flex-1"
		onclick={() => switchMethod('otp')}
		{disabled}
	>
		<Mail class="mr-1 h-3 w-3" />
		Email
	</Button>
	<Button
		variant={method === 'backup' ? 'default' : 'ghost'}
		size="sm"
		class="flex-1"
		onclick={() => switchMethod('backup')}
		{disabled}
	>
		<Key class="mr-1 h-3 w-3" />
		Backup
	</Button>
</div>
