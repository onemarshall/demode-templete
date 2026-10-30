<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeftIcon, CircleAlertIcon, FileCheckIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import { formatDate } from '$lib/app/components/montsel/format';

	let { data }: PageProps = $props();

	const engagement = $derived(data.engagement);
	const attention = $derived(
		['awaiting_input', 'quality_hold', 'failed'].includes(engagement.status)
	);
	const label = (value: string) => value.replaceAll('_', ' ');
	const form = $derived(page.form as { ok?: boolean; message?: string } | null);
	let selectedSection = $state('');
</script>

<svelte:head><title>{data.productName} — Montsel</title></svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<Button variant="ghost" size="sm" href="/app/diagnostic">
			<ArrowLeftIcon />
			Diagnostic
		</Button>
	</div>

	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-2">
			<p class="text-muted-foreground text-sm">{data.productName}</p>
			<h1 class="text-3xl font-semibold">Your diagnostic</h1>
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant={attention ? 'destructive' : 'outline'}>{data.statusLabel}</Badge>
				<span class="text-muted-foreground">
					{label(engagement.deliveryRoute)} · {label(engagement.family)}
				</span>
				{#if engagement.createdAt}
					<span class="text-muted-foreground">Started {formatDate(engagement.createdAt)}</span>
				{/if}
			</div>
		</div>
		{#if data.report}
			<Button variant="outline" href={`/app/documents?product=${encodeURIComponent(engagement.productKey)}`}>
				<FileCheckIcon />
				Documents
			</Button>
		{/if}
	</header>

	{#if attention}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-base">
					<CircleAlertIcon class="size-4" />
					{data.statusLabel}
				</Card.Title>
				<Card.Description>
					{engagement.failureDetail ??
						'The diagnostic cannot continue without attention. Nothing has been delivered.'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="text-muted-foreground text-sm">
				Your purchase is retained. Support can retry, correct the input or arrange a refund.
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Progress</Card.Title>
			<Card.Description>
				{#if engagement.engineJobId}
					Engine job {engagement.engineJobId.slice(0, 8)}…
				{:else}
					The engine job has not started yet.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.events.length}
				<ol class="flex flex-col gap-3">
					{#each data.events as event (event.occurredAt + event.status)}
						<li class="flex flex-col gap-1 border-l-2 pl-3">
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant="outline">{label(event.status)}</Badge>
								<span class="text-muted-foreground text-xs">
									{formatDate(event.occurredAt)}
								</span>
							</div>
							{#if event.message}
								<p class="text-sm">{event.message}</p>
							{/if}
						</li>
					{/each}
				</ol>
			{:else}
				<p class="text-muted-foreground text-sm">
					No progress has been recorded yet. The intake is queued.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if data.report}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Report</Card.Title>
				<Card.Description>
					Version {data.report.versionNumber} · {formatDate(data.report.createdAt)} · verified
					against <code class="text-xs">{data.report.contentHash.slice(0, 12)}…</code>
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<article class="prose max-w-none" aria-label="Delivered report">
					{@html data.report.contentHtml}
				</article>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Report</Card.Title>
				<Card.Description>
					The report will appear here when the engine has published it and its quality checks
					have passed.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}

	{#if data.outputVersion}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Questions and corrections</Card.Title>
				<Card.Description>
					Messages are recorded against version {data.outputVersion.versionNumber}. They never
					change the report or its hash.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#if form?.message}
					<p class={`rounded-md border px-3 py-2 text-sm ${form.ok === false ? 'text-destructive' : ''}`}>
						{form.message}
					</p>
				{/if}

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class={`rounded-md border px-2 py-1 text-xs ${selectedSection === '' ? 'bg-muted' : ''}`}
						onclick={() => (selectedSection = '')}
					>
						Whole report
					</button>
					{#each data.sections as section (section.key)}
						{@const count = data.threads.filter((thread) => thread.sectionKey === section.key).length}
						<button
							type="button"
							class={`rounded-md border px-2 py-1 text-xs ${selectedSection === section.key ? 'bg-muted' : ''}`}
							onclick={() => (selectedSection = section.key)}
						>
							{section.heading}{#if count}<span class="text-muted-foreground"> ({count})</span>{/if}
						</button>
					{/each}
				</div>

				<form method="POST" action="?/comment" class="flex flex-col gap-2">
					<input type="hidden" name="outputId" value={data.outputId ?? ''} />
					<input type="hidden" name="outputVersionId" value={data.outputVersion.id} />
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="flex flex-col gap-1">
							<label for="kind" class="text-sm font-medium">What kind of message?</label>
							<select id="kind" name="kind" class="border-input bg-background h-9 rounded-md border px-3 text-sm">
								{#if data.engagement.deliveryRoute === 'langfell_consultancy'}
									<option value="question">Question</option>
									<option value="revision_request">Revision request</option>
								{/if}
								<option value="correction">Correction</option>
								{#if data.engagement.deliveryRoute !== 'langfell_consultancy'}
									<option value="explanation">Explanation</option>
								{/if}
							</select>
						</div>
						<div class="flex flex-col gap-1">
							<label for="sectionKey" class="text-sm font-medium">Section (optional)</label>
							<select
								id="sectionKey"
								name="sectionKey"
								bind:value={selectedSection}
								class="border-input bg-background h-9 rounded-md border px-3 text-sm"
							>
								<option value="">Whole report</option>
								{#each data.sections as section (section.key)}
									<option value={section.key}>{section.heading}</option>
								{/each}
							</select>
						</div>
					</div>
					<textarea
						name="body"
						required
						rows="3"
						class="border-input bg-background rounded-md border px-3 py-2 text-sm"
						placeholder={data.engagement.deliveryRoute === 'langfell_consultancy'
							? 'Ask a question, request a revision or report a correction.'
							: 'Report a factual error or ask for an explanation.'}
					></textarea>
					<div><Button type="submit">Record message</Button></div>
				</form>

				{#if data.threads.length}
					<div class="flex flex-col gap-3">
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
										placeholder="Reply"
									/>
									<Button type="submit" variant="outline" size="sm">Reply</Button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
