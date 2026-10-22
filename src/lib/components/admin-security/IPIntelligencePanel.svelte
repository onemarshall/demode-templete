<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import type { IPIntelligence } from '#lib/auth/security/services/sdk.js';
	let { ipIntelligence = null }: { ipIntelligence: IPIntelligence | null } = $props();
</script>
<Card.Root>
	<Card.Header>
		<Card.Title>Which network sources need context?</Card.Title>
		<Card.Description>These assessments are inferred from recorded event risk and blocked-request counts. They are not external reputation checks or verified location data.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-5">
		{#if ipIntelligence}
			<div class="flex flex-col gap-3">
				<h3 class="font-medium">Sources ranked by the local assessment</h3>
				<p class="text-muted-foreground text-sm">A lower score indicates more recorded risk or blocks. It does not prove that an IP is malicious; a high score does not establish trust.</p>
				<dl class="flex flex-col gap-2">
					{#each ipIntelligence.ipReputationScores as record (record.ip)}<div class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><dt class="text-sm break-all">{record.ip}</dt><dd><Badge variant="secondary">Local score {record.score}/100</Badge></dd></div>{:else}<div class="text-muted-foreground text-sm">No source assessments were returned.</div>{/each}
				</dl>
			</div>
			{#if ipIntelligence.knownBadActors.length > 0}
				<div class="flex flex-col gap-3"><h3 class="font-medium">Sources with repeated blocked requests</h3><p class="text-muted-foreground text-sm">At least three blocked events were recorded per source in the available sample. This is a local pattern, not a confirmed attacker identity.</p><ul class="flex flex-col gap-2">{#each ipIntelligence.knownBadActors as source (source.ip)}<li class="flex flex-wrap justify-between gap-3 rounded-md border p-3 text-sm"><span class="break-all">{source.ip}</span><span class="text-muted-foreground">First observed block: {new Date(source.firstSeen).toLocaleString()}</span></li>{/each}</ul></div>
			{/if}
			{#if ipIntelligence.torExitNodes.length > 0}<div class="flex flex-col gap-2"><h3 class="font-medium">Recorded proxy, VPN or Tor signals</h3><p class="text-muted-foreground text-sm">A network signal alone does not establish misuse.</p><ul class="flex flex-wrap gap-2">{#each ipIntelligence.torExitNodes as source, index (`${source.ip}:${index}`)}<li><Badge variant="outline">{source.ip}</Badge></li>{/each}</ul></div>{/if}
		{:else}<p class="text-muted-foreground py-4 text-sm">Network-source observations are unavailable.</p>{/if}
	</Card.Content>
</Card.Root>
