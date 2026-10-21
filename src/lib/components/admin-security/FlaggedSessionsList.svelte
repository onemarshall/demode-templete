<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import {
		Eye,
		ChevronDown,
		ChevronUp,
		Ban,
		ShieldCheck,
		X,
		RefreshCw,
		Shield,
	} from "@lucide/svelte";
	import { enhance } from "$app/forms";
	import type { FlaggedSession } from "$lib/auth/security/types";

	let { sessions }: { sessions: FlaggedSession[] } = $props();

	let expandedSession = $state<string | null>(null);
	let actionInProgress = $state<string | null>(null);

	function getRiskBadgeVariant(score: number): "low" | "medium" | "high" {
		if (score >= 50) return "high";
		if (score >= 25) return "medium";
		return "low";
	}

	function getCountryFlag(countryCode: string): string {
		if (!countryCode || countryCode === "XX") return "🌍";
		const codePoints = countryCode
			.toUpperCase()
			.split("")
			.map((char) => 127397 + char.charCodeAt(0));
		return String.fromCodePoint(...codePoints);
	}

	function toggleSessionExpand(sessionId: string) {
		expandedSession = expandedSession === sessionId ? null : sessionId;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Eye class="h-5 w-5" />
			Who logged in suspiciously?
		</Card.Title>
		<Card.Description>
			Sign-ins that scored high on risk and are worth a look. Click to expand details.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if sessions && sessions.length > 0}
			<div class="space-y-3">
				{#each sessions as session}
					{@const sessionId = `${session.userId}:${session.ip}`}
					{@const isExpanded = expandedSession === sessionId}
					<div class="rounded-lg border">
						<!-- Session Header (clickable) -->
						<button
							type="button"
							class="hover:bg-muted/50 flex w-full items-start justify-between p-4 text-left transition-colors"
							onclick={() => toggleSessionExpand(sessionId)}
						>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-mono text-sm"
										>{session.userId?.slice(0, 8) ??
											"unknown"}...</span
									>
									<Badge
										variant={getRiskBadgeVariant(
											session.riskScore,
										)}
									>
										Risk: {session.riskScore}
									</Badge>
									{#if session.isVpn}
										<Badge variant="medium">VPN</Badge>
									{/if}
								</div>
								<p class="text-muted-foreground text-xs">
									IP: {session.ip}
								</p>
								<div class="flex flex-wrap gap-1 pt-1">
									{#each (session.riskFactors || []).slice(0, 5) as factor}
										<Badge
											variant="outline"
											class="text-[0.65rem]"
										>
											{factor.replace(/_/g, " ")}
										</Badge>
									{/each}
									{#if (session.riskFactors || []).length > 5}
										<Badge
											variant="outline"
											class="text-[0.65rem]"
										>
											+{(session.riskFactors || [])
												.length - 5} more
										</Badge>
									{/if}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<div class="flex gap-1">
									<Badge
										variant={session.trustLevel === "high"
											? "low"
											: "high"}
										class="text-[0.6rem]"
									>
										Device
									</Badge>
									<Badge
										variant={session.trustLevel === "high"
											? "low"
											: "high"}
										class="text-[0.6rem]"
									>
										Behavior
									</Badge>
									<Badge
										variant={session.trustLevel === "high"
											? "low"
											: "high"}
										class="text-[0.6rem]"
									>
										Location
									</Badge>
								</div>
								{#if isExpanded}
									<ChevronUp
										class="text-muted-foreground h-4 w-4"
									/>
								{:else}
									<ChevronDown
										class="text-muted-foreground h-4 w-4"
									/>
								{/if}
							</div>
						</button>

						<!-- Expanded Details -->
						{#if isExpanded}
							<div class="bg-muted/30 border-t p-4">
								<div class="grid gap-4 md:grid-cols-2">
									<!-- Session Details -->
									<div class="space-y-2">
										<h4 class="text-sm font-semibold">
											Session Details
										</h4>
										<div class="space-y-1 text-sm">
											<p>
												<span
													class="text-muted-foreground"
													>User ID:</span
												>
												{session.userId}
											</p>
											<p>
												<span
													class="text-muted-foreground"
													>IP Address:</span
												>
												{session.ip}
											</p>
											<p>
												<span
													class="text-muted-foreground"
													>Trust Level:</span
												>
												{session.trustLevel}
											</p>
											<p>
												<span
													class="text-muted-foreground"
													>Risk Level:</span
												>
												{session.riskLevel}
											</p>
										</div>
										{#if session.countryCode}
											<div class="mt-2">
												<p
													class="text-muted-foreground text-xs"
												>
													Location
												</p>
												<p class="text-sm">
													{getCountryFlag(
														session.countryCode ||
															"",
													)}
													{session.city || "Unknown"}
												</p>
											</div>
										{/if}
									</div>

									<!-- All Risk Factors -->
									<div class="space-y-2">
										<h4 class="text-sm font-semibold">
											All Risk Factors
										</h4>
										<div class="flex flex-wrap gap-1">
											{#each session.riskFactors as factor}
												<Badge
													variant="outline"
													class="text-xs"
												>
													{factor.replace(/_/g, " ")}
												</Badge>
											{/each}
										</div>
									</div>
								</div>

								<!-- Action Buttons -->
								<Separator {...{ class: "my-4" }} />
								<div class="flex flex-wrap gap-2">
									<form
										method="POST"
										action="?/blockIp"
										use:enhance={() => {
											actionInProgress = `block:${session.ip}`;
											return async ({ update }) => {
												await update();
												actionInProgress = null;
											};
										}}
									>
										<input
											type="hidden"
											name="ip"
											value={session.ip}
										/>
										<Button
											type="submit"
											variant="destructive"
											size="sm"
											class="gap-1"
											disabled={actionInProgress ===
												`block:${session.ip}`}
										>
											{#if actionInProgress === `block:${session.ip}`}
												<RefreshCw
													class="h-3 w-3 animate-spin"
												/>
											{:else}
												<Ban class="h-3 w-3" />
											{/if}
											Block IP
										</Button>
									</form>

									<form
										method="POST"
										action="?/whitelistDevice"
										use:enhance={() => {
											actionInProgress = `whitelist:${session.userId}`;
											return async ({ update }) => {
												await update();
												actionInProgress = null;
											};
										}}
									>
										<input
											type="hidden"
											name="visitorId"
											value={session.deviceId ||
												session.userId}
										/>
										<input
											type="hidden"
											name="userId"
											value={session.userId}
										/>
										<Button
											type="submit"
											variant="outline"
											size="sm"
											class="gap-1"
											disabled={actionInProgress ===
												`whitelist:${session.userId}`}
										>
											{#if actionInProgress === `whitelist:${session.userId}`}
												<RefreshCw
													class="h-3 w-3 animate-spin"
												/>
											{:else}
												<ShieldCheck class="h-3 w-3" />
											{/if}
											Whitelist Device
										</Button>
									</form>

									<form
										method="POST"
										action="?/dismissSession"
										use:enhance={() => {
											actionInProgress = `dismiss:${sessionId}`;
											return async ({ update }) => {
												await update();
												actionInProgress = null;
											};
										}}
									>
										<input
											type="hidden"
											name="userId"
											value={session.userId}
										/>
										<input
											type="hidden"
											name="ip"
											value={session.ip}
										/>
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="gap-1"
											disabled={actionInProgress ===
												`dismiss:${sessionId}`}
										>
											{#if actionInProgress === `dismiss:${sessionId}`}
												<RefreshCw
													class="h-3 w-3 animate-spin"
												/>
											{:else}
												<X class="h-3 w-3" />
											{/if}
											Dismiss
										</Button>
									</form>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground py-8 text-center">
				<Shield class="mx-auto h-12 w-12 opacity-50" />
				<p class="mt-2">No flagged sessions</p>
				<p class="text-sm">
					All sessions are within acceptable risk thresholds
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
