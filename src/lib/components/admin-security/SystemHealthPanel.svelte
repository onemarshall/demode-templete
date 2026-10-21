<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { CircleCheck, TriangleAlert, Activity } from "@lucide/svelte";
	import type {
		SystemHealthStatus,
		HealthStatus,
	} from "$lib/auth/security/types";

	let {
		systemHealth = undefined,
	}: { systemHealth?: SystemHealthStatus | null } = $props();

	const statusMeta: Record<
		HealthStatus,
		{ label: string; badge: string; icon: typeof CircleCheck }
	> = {
		operational: {
			label: "Operational",
			badge: "border-emerald-200 text-emerald-700 bg-emerald-50",
			icon: CircleCheck,
		},
		degraded: {
			label: "Degraded",
			badge: "border-amber-200 text-amber-800 bg-amber-50",
			icon: TriangleAlert,
		},
		down: {
			label: "Down",
			badge: "border-red-200 text-red-800 bg-red-50",
			icon: TriangleAlert,
		},
		critical: {
			label: "Critical",
			badge: "border-red-200 text-red-800 bg-red-50",
			icon: TriangleAlert,
		},
	};

	const overallStatus = $derived(
		systemHealth?.overallStatus ?? "operational",
	);
	const metrics = $derived(systemHealth?.metrics ?? []);

	function formatTimestamp(timestamp?: number) {
		if (!timestamp) return "";
		return new Intl.DateTimeFormat("en", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).format(timestamp);
	}
</script>

<Card.Root class="bg-card border shadow-md">
	<Card.Header class="flex flex-col gap-3">
		<div class=" flex w-full items-center justify-between gap-4">
			<div>
				<Card.Title class="flex items-center gap-2 text-lg">
					<Activity class="h-5 w-5" />
					Is the security system itself OK?
				</Card.Title>
				<Card.Description>
					{systemHealth
						? systemHealth.summary
						: "System health data is currently unavailable."}
				</Card.Description>
			</div>

			{#if systemHealth}
				{@const status = systemHealth.overallStatus ?? "operational"}
				{#if statusMeta[status]}
					{@const Icon = statusMeta[status].icon}
					<span
						class={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${statusMeta[status].badge}`}
					>
						<Icon class="h-4 w-4" />
						{statusMeta[status].label}
					</span>
				{/if}
			{:else}
				<span
					class="border-muted text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
				>
					<Activity class="h-4 w-4" />
					Unknown
				</span>
			{/if}
		</div>

		{#if systemHealth?.updatedAt}
			<p class="text-muted-foreground text-xs">
				Updated at {formatTimestamp(systemHealth.updatedAt)}
			</p>
		{/if}
	</Card.Header>

	<Card.Content>
		{#if !systemHealth}
			<div class="text-muted-foreground text-sm">
				Unable to reach system health endpoint. Verify plugin
				configuration.
			</div>
		{:else}
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each metrics as metric}
					<div class="bg-muted/30 rounded-lg border p-4">
						<div class="flex items-start justify-between gap-2">
							<div>
								<p
									class="text-muted-foreground text-xs tracking-wide uppercase"
								>
									{metric.label}
								</p>
								<p class="text-xl font-semibold">
									{metric.value}
									{#if metric.unit}
										<span
											class="text-muted-foreground text-sm"
											>{metric.unit}</span
										>
									{/if}
								</p>
							</div>
							<Badge
								variant="secondary"
								class={`capitalize ${statusMeta[metric.status]?.badge ?? ""}`}
							>
								{statusMeta[metric.status]?.label ??
									metric.status}
							</Badge>
						</div>
						<p class="text-muted-foreground mt-2 text-xs">
							{metric.description}
						</p>

						{#if metric.trend && metric.trend.length}
							<div class="mt-3 flex gap-1">
								{#each metric.trend as value, idx}
									<div
										class="bg-primary/20 flex-1 rounded-sm"
										style={`height:${Math.max(4, value)}px; opacity:${0.4 + idx / (metric.trend.length * 1.2)};`}
									></div>
								{/each}
							</div>
						{/if}

						{#if metric.details}
							<Separator {...{ class: "my-3" }} />
							<div class="grid grid-cols-2 gap-2 text-xs">
								{#each Object.entries(metric.details) as [key, value]}
									<div
										class="text-muted-foreground capitalize"
									>
										{key.replace(/([A-Z])/g, " $1")}
									</div>
									<div class="text-right font-medium">
										{value as string}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if systemHealth.recommendations && systemHealth.recommendations.length}
				<Separator {...{ class: "my-4" }} />
				<div class="space-y-2">
					<p class="text-sm font-semibold">Recommended Actions</p>
					<ul
						class="text-muted-foreground list-disc space-y-1 pl-5 text-sm"
					>
						{#each systemHealth.recommendations as note}
							<li>{note}</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
