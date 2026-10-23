<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Home } from '@lucide/svelte';
</script>

<div class="bg-muted flex min-h-svh items-center justify-center p-6 md:p-10">
	<Card.Root class="w-full max-w-lg">
		<Card.Header>
			<Card.Title>Account deletion confirmation</Card.Title>
			<Card.Description>
				If you arrived here after following your deletion confirmation link, your sign-in account has been deleted.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-muted-foreground text-sm">Billing records, security logs and records in connected services are handled separately. Deleting your sign-in account does not erase every record held by those services.</p>
		</Card.Content>
		<Card.Footer>
			<Button href="/"><Home data-icon="inline-start" />Return home</Button>
		</Card.Footer>
	</Card.Root>
</div>
