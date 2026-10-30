<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();
	const form = $derived(page.form as { ok?: boolean; message?: string } | null);
</script>

<svelte:head><title>Consultant grants — Admin</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col gap-8">
	<header class="flex flex-col gap-2">
		<p class="text-muted-foreground text-sm">Consulting</p>
		<h1 class="text-3xl font-semibold">Consultant grants</h1>
		<p class="text-muted-foreground text-sm">
			A grant is engagement-scoped. It never makes the consultant a member of the client brand.
			Reviewer can accept analysis and record report review; strategist can also approve the
			decision record; publisher can publish.
		</p>
	</header>

	{#if form?.message}
		<p class={`rounded-md border px-3 py-2 text-sm ${form.ok === false ? 'text-destructive' : ''}`}>
			{form.message}
		</p>
	{/if}

	<form method="POST" action="?/grant" class="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
		<div class="flex flex-col gap-1">
			<label for="email" class="text-sm font-medium">Consultant email</label>
			<input
				id="email"
				name="email"
				type="email"
				required
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="engagementId" class="text-sm font-medium">Engagement id</label>
			<input
				id="engagementId"
				name="engagementId"
				required
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
				placeholder="eng_..."
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="role" class="text-sm font-medium">Role</label>
			<select
				id="role"
				name="role"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			>
				<option value="reviewer">Reviewer</option>
				<option value="strategist">Strategist</option>
				<option value="publisher">Publisher</option>
			</select>
		</div>
		<div class="flex flex-col gap-1">
			<label for="expiresAt" class="text-sm font-medium">Expires (optional)</label>
			<input
				id="expiresAt"
				name="expiresAt"
				type="date"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
		</div>
		<div class="sm:col-span-2">
			<Button type="submit">Grant access</Button>
		</div>
	</form>

	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead class="border-b">
				<tr>
					<th class="py-2 pr-3">Brand</th>
					<th class="py-2 pr-3">Family</th>
					<th class="py-2 pr-3">Consultant</th>
					<th class="py-2 pr-3">Role</th>
					<th class="py-2 pr-3">Status</th>
					<th class="py-2 pr-3">Expires</th>
					<th class="py-2">Action</th>
				</tr>
			</thead>
			<tbody>
				{#each data.grants as grant (grant.id)}
					<tr class="border-b">
						<td class="py-2 pr-3">{grant.brandName}</td>
						<td class="py-2 pr-3">{grant.family}</td>
						<td class="py-2 pr-3">{grant.userEmail ?? grant.userId}</td>
						<td class="py-2 pr-3">{grant.role}</td>
						<td class="py-2 pr-3"><Badge variant="outline">{grant.status}</Badge></td>
						<td class="py-2 pr-3">{grant.expiresAt ? formatDate(grant.expiresAt) : 'No expiry'}</td>
						<td class="py-2">
							{#if grant.status === 'active'}
								<form method="POST" action="?/revoke">
									<input type="hidden" name="grantId" value={grant.id} />
									<Button type="submit" variant="outline" size="sm">Revoke</Button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
