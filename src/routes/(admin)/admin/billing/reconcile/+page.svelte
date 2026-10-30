<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const form = $derived(page.form as { ok?: boolean; message?: string } | null);
</script>

<svelte:head><title>Reconcile external payment — Admin</title></svelte:head>

<div class="mx-auto flex max-w-xl flex-col gap-6">
	<header class="flex flex-col gap-2">
		<p class="text-muted-foreground text-sm">Billing</p>
		<h1 class="text-3xl font-semibold">Reconcile an external payment</h1>
		<p class="text-muted-foreground text-sm">
			Use only after the funds are verified against the reference. This activates the order and
			grants its entitlement; it does not issue an invoice.
		</p>
	</header>

	{#if form?.message}
		<p class={`rounded-md border px-3 py-2 text-sm ${form.ok === false ? 'text-destructive' : ''}`}>
			{form.message}
		</p>
	{/if}

	<form method="POST" class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<label for="purchaseId" class="text-sm font-medium">Purchase id</label>
			<input
				id="purchaseId"
				name="purchaseId"
				required
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				placeholder="pur_..."
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label for="reference" class="text-sm font-medium">Verified payment reference</label>
			<input
				id="reference"
				name="reference"
				required
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				placeholder="Bank reference, remittance id or statement line"
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label for="notes" class="text-sm font-medium">Notes</label>
			<textarea
				id="notes"
				name="notes"
				rows="3"
				class="border-input bg-background rounded-md border px-3 py-2 text-sm"
				placeholder="What was checked, by whom and against which statement."
			></textarea>
		</div>
		<div><Button type="submit">Verify and activate</Button></div>
	</form>
</div>
