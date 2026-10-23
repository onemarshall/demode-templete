<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Account &amp; privacy</Card.Title>
		<Card.Description>Review account information and account deletion in your privacy settings.</Card.Description>
	</Card.Header>
	<Card.Content>
		<Button href="/auth/account" variant="outline">Open account &amp; privacy</Button>
	</Card.Content>
</Card.Root>
