<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { SwitcherOrganisation } from '$lib/server/workspace/resolution';
	let { organisations }: { organisations: SwitcherOrganisation[] } = $props();
</script>
<nav aria-label="Organisations and workspaces" class="flex flex-wrap items-center gap-3 border-b pb-4">
	<Button href="/organisations" variant="outline">All organisations</Button>
	<details class="relative">
		<summary class="cursor-pointer rounded-md border px-3 py-2 text-sm">Switch workspace</summary>
		<div class="absolute left-0 top-full min-w-64 rounded-lg border bg-background p-4 shadow-lg">
			{#each organisations as org (org.organisationId)}
				<section class="mb-4 flex flex-col gap-2">
					<a class="font-medium underline" href={`/o/${encodeURIComponent(org.organisationSlug)}/settings`}>{org.organisationName}</a>
					{#each org.workspaces as workspace (workspace.workspaceId)}
						<a class="text-sm underline" href={`/o/${encodeURIComponent(org.organisationSlug)}/w/${encodeURIComponent(workspace.workspaceSlug)}`}>{workspace.workspaceName}</a>
					{:else}<p class="text-sm text-muted-foreground">No assigned workspaces</p>{/each}
				</section>
			{:else}<p class="text-sm text-muted-foreground">Create an organisation to begin.</p>{/each}
		</div>
	</details>
	<Button href="/auth/account" variant="ghost">Account</Button>
</nav>
