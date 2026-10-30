<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();

	const label = (value: string) => value.replaceAll('_', ' ');
	const latest = $derived(data.events.at(-1)?.status ?? data.engagement.status);
	const form = $derived(
		page.form as { ok?: boolean; message?: string } | null
	);
	const fields = $derived(
		(data.decision?.currentVersion.fields ?? {}) as Record<string, unknown>
	);
	const text = (key: string) =>
		typeof fields[key] === 'string' ? String(fields[key]) : '';
	const list = (key: string) =>
		Array.isArray(fields[key]) ? (fields[key] as string[]) : [];
	const listText = (key: string) => list(key).join('\n');
	const showDecision = $derived(
		Boolean(data.decision) ||
			latest === 'needs_decision_record' ||
			latest === 'needs_analysis_review'
	);
</script>

<svelte:head><title>{data.engagement.brandName} — Consulting</title></svelte:head>

<div class="flex flex-col gap-6">
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-2">
			<p class="text-muted-foreground text-sm">Consulting engagement</p>
			<h1 class="text-3xl font-semibold">{data.engagement.brandName}</h1>
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant="outline">{label(data.engagement.family)}</Badge>
				<Badge variant="outline">{label(data.engagement.status)}</Badge>
				<span class="text-muted-foreground">
					{label(data.engagement.deliveryRoute)} · your role: {data.grant.role}
				</span>
			</div>
		</div>
		<Button variant="outline" href="/consult">All engagements</Button>
	</header>

	{#if form?.message}
		<Card.Root>
			<Card.Content class={`py-3 text-sm ${form.ok === false ? 'text-destructive' : ''}`}>
				{form.message}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Run</Card.Title>
			<Card.Description>
				Engine job {data.engagement.engineJobId?.slice(0, 8) ?? 'not started'}
				{#if data.engagement.engineRunRef}
					· production run {data.engagement.engineRunRef.slice(0, 8)}
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			<ol class="flex flex-col gap-2">
				{#each data.events as event (event.occurredAt + event.status)}
					<li class="flex flex-wrap items-center gap-2 text-sm">
						<Badge variant="outline">{label(event.status)}</Badge>
						<span class="text-muted-foreground text-xs">{formatDate(event.occurredAt)}</span>
						{#if event.message}<span>{event.message}</span>{/if}
					</li>
				{/each}
			</ol>
			{#if latest === 'needs_analysis_review'}
				<form method="POST" action="?/accept" class="flex flex-col gap-2">
					<label for="accept-notes" class="text-sm font-medium">Analysis review notes</label>
					<textarea
						id="accept-notes"
						name="notes"
						required
						rows="3"
						class="border-input bg-background rounded-md border px-3 py-2 text-sm"
						placeholder="What you checked, what you accept and any limitation you are carrying."
					></textarea>
					<div><Button type="submit">Accept the exact analysis</Button></div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if showDecision}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Decision record</Card.Title>
				<Card.Description>
					{#if data.decision}
						Version {data.decision.currentVersion.version} · {data.decision.status} ·
						hash {data.decision.currentVersion.contentHash.slice(0, 12)}…
					{:else}
						No decision record has been generated yet.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#if !data.decision}
					<form method="POST" action="?/decision">
						<Button type="submit">Generate the candidate record</Button>
					</form>
				{:else}
					<form method="POST" action="?/save" class="flex flex-col gap-3 text-sm">
						<div class="flex flex-col gap-1">
							<label for="principal_finding" class="font-medium">Principal finding</label>
							<textarea id="principal_finding" name="principal_finding" rows="3" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{text('principal_finding')}</textarea>
						</div>
						<div class="flex flex-col gap-1">
							<label for="recommendation" class="font-medium">Recommendation</label>
							<textarea id="recommendation" name="recommendation" rows="3" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{text('recommendation')}</textarea>
						</div>
						<div class="flex flex-col gap-1">
							<label for="confidence" class="font-medium">Confidence</label>
							<select id="confidence" name="confidence" class="border-input bg-background h-9 rounded-md border px-3 text-sm">
								{#each ['high', 'medium', 'unproven'] as value}
									<option value={value} selected={text('confidence') === value}>{value}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col gap-1">
							<label for="counterevidence" class="font-medium">Counterevidence and strongest alternatives</label>
							<textarea id="counterevidence" name="counterevidence" rows="3" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{text('counterevidence')}</textarea>
						</div>
						<div class="flex flex-col gap-1">
							<label for="unknowns" class="font-medium">Unknowns and limits</label>
							<textarea id="unknowns" name="unknowns" rows="3" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{text('unknowns')}</textarea>
						</div>
						<div class="flex flex-col gap-1">
							<label for="commercial_material_consequence" class="font-medium">Material consequence</label>
							<textarea id="commercial_material_consequence" name="commercial_material_consequence" rows="2" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{text('commercial_material_consequence')}</textarea>
						</div>
						<div class="grid gap-3 sm:grid-cols-3">
							<div class="flex flex-col gap-1">
								<label for="do_now" class="font-medium">Do now (one per line)</label>
								<textarea id="do_now" name="do_now" rows="4" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{listText('do_now')}</textarea>
							</div>
							<div class="flex flex-col gap-1">
								<label for="hold" class="font-medium">Hold (one per line)</label>
								<textarea id="hold" name="hold" rows="4" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{listText('hold')}</textarea>
							</div>
							<div class="flex flex-col gap-1">
								<label for="do_not_do_yet" class="font-medium">Do not do yet (one per line)</label>
								<textarea id="do_not_do_yet" name="do_not_do_yet" rows="4" class="border-input bg-background rounded-md border px-3 py-2 text-sm">{listText('do_not_do_yet')}</textarea>
							</div>
						</div>
						<div class="flex flex-col gap-1">
							<label for="next_decision_gate" class="font-medium">Next decision gate</label>
							<input id="next_decision_gate" name="next_decision_gate" value={text('next_decision_gate')} class="border-input bg-background h-9 rounded-md border px-3 text-sm" />
						</div>
						<div class="flex flex-col gap-1">
							<label for="rationale" class="font-medium">Why this pass changes the record</label>
							<textarea id="rationale" name="rationale" required rows="2" class="border-input bg-background rounded-md border px-3 py-2 text-sm" placeholder="What you changed and why, in one or two sentences."></textarea>
						</div>
						<div><Button type="submit">Save as a new version</Button></div>
					</form>

					{#if data.brief}
						<details class="rounded-md border p-3">
							<summary class="cursor-pointer text-sm font-medium">Consultant brief</summary>
							<pre class="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">{data.brief.briefMd}</pre>
						</details>
					{/if}

					<details class="rounded-md border p-3">
						<summary class="cursor-pointer text-sm font-medium">Advanced: paste a decision delta</summary>
					<form method="POST" action="?/delta" class="mt-3 flex flex-col gap-2">
						<label for="delta" class="text-sm font-medium">Decision delta (JSON)</label>
						<textarea
							id="delta"
							name="delta"
							required
							rows="8"
							class="border-input bg-background rounded-md border px-3 py-2 font-mono text-xs"
							placeholder={'{\n  "schema_version": "diagnostic-decision-delta.v1",\n  "base_version": 1,\n  "changes": [{"field": "principal_finding", "to": "...", "reason": "..."}],\n  "authored_by": "you"\n}'}
						></textarea>
						<input type="hidden" name="version" value={data.decision.currentVersion.version} />
						<div><Button type="submit" variant="outline">Apply delta as a new version</Button></div>
					</form>
					</details>

					<form method="POST" action="?/approve" class="flex items-center gap-3">
						<input type="hidden" name="version" value={data.decision.currentVersion.version} />
						<Button type="submit">Approve version {data.decision.currentVersion.version}</Button>
						<span class="text-muted-foreground text-xs">
							Approval freezes this exact hash and is required before the report can be generated.
						</span>
					</form>

					<div class="text-xs">
						<strong>Versions</strong>
						<ul class="mt-1 flex flex-col gap-1">
							{#each data.decision.versions as version (version.version)}
								<li>
									v{version.version} · {version.source} · {version.createdBy} ·
									{formatDate(version.createdAt)} · {version.contentHash.slice(0, 12)}…
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.decision?.status === 'approved' || latest === 'needs_decision_record'}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Report</Card.Title>
				<Card.Description>
					{#if data.decision?.status === 'approved'}
						The decision record is approved. Generate the report from it.
					{:else}
						Approve the decision record before generating the report.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-3">
				{#if data.decision?.status === 'approved'}
					<form method="POST" action="?/generate">
						<Button type="submit">Generate the report</Button>
					</form>
				{/if}
				{#if latest === 'review_required' || latest === 'approved'}
					<form method="POST" action="?/review" class="flex w-full flex-col gap-2">
						<label for="review-decision" class="text-sm font-medium">Report review</label>
						<select
							id="review-decision"
							name="decision"
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						>
							<option value="approved">Approve</option>
							<option value="changes_requested">Request changes</option>
							<option value="rejected">Reject</option>
						</select>
						<textarea
							name="notes"
							required
							rows="3"
							class="border-input bg-background rounded-md border px-3 py-2 text-sm"
							placeholder="Substantive review notes."
						></textarea>
						<div><Button type="submit" variant="outline">Record report review</Button></div>
					</form>
				{/if}
				{#if latest === 'approved' || data.engagement.status === 'ready'}
					<form method="POST" action="?/publish">
						<Button type="submit">Publish and import</Button>
					</form>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.threads.length}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Client conversation</Card.Title>
				<Card.Description>
					Threads raised against the delivered version. Replies are recorded as consultant
					messages; they do not change the report.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each data.threads as thread (thread.id)}
					<div class="rounded-md border p-3">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="outline">{label(thread.kind)}</Badge>
							<Badge variant="ghost">{label(thread.status)}</Badge>
							{#if thread.sectionKey}
								<span class="text-muted-foreground text-xs">{thread.sectionKey}</span>
							{/if}
							<span class="text-muted-foreground text-xs">{formatDate(thread.createdAt)}</span>
						</div>
						<div class="mt-2 flex flex-col gap-2">
							{#each thread.messages as message (message.id)}
								<div class="text-sm">
									<span class="text-muted-foreground text-xs">
										{message.authorRole} · {formatDate(message.createdAt)}
									</span>
									<p>{message.body}</p>
								</div>
							{/each}
						</div>
						<form method="POST" action="?/reply" class="mt-2 flex gap-2">
							<input type="hidden" name="threadId" value={thread.id} />
							<input
								name="body"
								required
								class="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
								placeholder="Reply to the client"
							/>
							<Button type="submit" variant="outline" size="sm">Reply</Button>
						</form>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
