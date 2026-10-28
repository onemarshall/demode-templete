<script lang="ts">
	/**
	 * Designer Send: the delivery action, not a third document.
	 *
	 * Only rendered for a contract that belongs to an account, because the link
	 * inside the email has to keep working after it is sent.
	 */
	import { Button } from '$lib/components/ui/button';
	import { CheckIcon, SendIcon } from '@lucide/svelte';

	let {
		senderName,
		message = null,
		sentTo = null
	}: {
		senderName: string;
		message?: string | null;
		sentTo?: string | null;
	} = $props();
</script>

<section class="flex flex-col gap-4 rounded-xl border p-6" aria-labelledby="send-heading">
	<div class="flex flex-col gap-1">
		<h2 id="send-heading" class="text-lg font-semibold">Send it to your designer</h2>
		<p class="text-muted-foreground max-w-xl text-sm">
			They get a short email with the link and the six commitments, so they can read the direction
			before work starts.
		</p>
	</div>

	{#if sentTo}
		<p class="flex items-center gap-2 rounded-md border px-4 py-3 text-sm">
			<CheckIcon class="size-4" aria-hidden="true" />
			Sent to {sentTo}.
		</p>
	{/if}

	{#if message}
		<p class="border-destructive/40 text-destructive rounded-md border px-4 py-3 text-sm">
			{message}
		</p>
	{/if}

	<form method="POST" action="?/send" class="flex flex-col gap-4">
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<label for="recipientEmail" class="text-sm font-medium">Designer's email</label>
				<input
					id="recipientEmail"
					name="recipientEmail"
					type="email"
					required
					maxlength="200"
					class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<label for="recipientName" class="text-sm font-medium">Their name (optional)</label>
				<input
					id="recipientName"
					name="recipientName"
					maxlength="120"
					class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				/>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<label for="introLine" class="text-sm font-medium">Add a line (optional)</label>
			<textarea
				id="introLine"
				name="introLine"
				rows="2"
				maxlength="300"
				placeholder="Anything you want them to read first."
				class="border-input bg-background rounded-md border px-3 py-2 text-sm"></textarea>
		</div>

		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="sendCopy" value="1" class="size-4" />
			Send me a copy
		</label>

		<div class="flex flex-wrap items-center gap-3">
			<Button type="submit">
				<SendIcon />
				Send to designer
			</Button>
			<span class="text-muted-foreground text-xs">Sending records delivery, not acceptance.</span>
		</div>

		<input type="hidden" name="senderName" value={senderName} />
	</form>
</section>
