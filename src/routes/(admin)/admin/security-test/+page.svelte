<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';
	import {
		Loader2,
		Play,
		AlertTriangle,
		Shield,
		Globe,
		Smartphone,
		Activity,
		Clock
	} from '@lucide/svelte';
	import { runSecurityTestScenario } from '#lib/remote/security/testing.remote.js';

	const testScenarios = [
		{
			category: 'IP Intelligence',
			icon: Globe,
			scenarios: [
				{
					id: 'vpn_ip',
					name: 'VPN/Proxy IP',
					desc: 'Simulate connection from VPN',
					risk: 'medium'
				},
				{ id: 'tor_ip', name: 'Tor Exit Node', desc: 'Simulate Tor connection', risk: 'high' },
				{ id: 'datacenter_ip', name: 'Datacenter IP', desc: 'Simulate AWS/Azure IP', risk: 'low' },
				{ id: 'malicious_ip', name: 'Malicious IP', desc: 'Known bad actor IP', risk: 'critical' }
			]
		},
		{
			category: 'Device Analysis',
			icon: Smartphone,
			scenarios: [
				{
					id: 'new_device',
					name: 'New Device',
					desc: 'Unknown device fingerprint',
					risk: 'medium'
				},
				{ id: 'bot_device', name: 'Bot/Crawler', desc: 'Bot user agent detected', risk: 'high' }
			]
		},
		{
			category: 'Behavior Patterns',
			icon: Activity,
			scenarios: [
				{
					id: 'rapid_requests',
					name: 'Rapid Requests',
					desc: 'Single rate-limited request event',
					risk: 'high'
				},
				{
					id: 'failed_logins',
					name: 'Failed Logins',
					desc: 'Single failed login event',
					risk: 'high'
				},
				{ id: 'mouse_bot', name: 'Bot Mouse', desc: 'Linear mouse movement', risk: 'medium' }
			]
		},
		{
			category: 'Session & Location',
			icon: Clock,
			scenarios: [
				{
					id: 'suspicious_location',
					name: 'Suspicious Country',
					desc: 'Login from high-risk country',
					risk: 'medium'
				},
				{
					id: 'new_location',
					name: 'Impossible Travel',
					desc: '5000km in 1 minute',
					risk: 'critical'
				},
				{
					id: 'concurrent_sessions',
					name: 'Many Sessions',
					desc: 'Single session anomaly event',
					risk: 'medium'
				},
				{ id: 'long_session', name: 'Long Session', desc: '24+ hour active session', risk: 'low' }
			]
		},
		{
			category: 'Panel Coverage',
			icon: Shield,
			scenarios: [
				{
					id: 'password_reset',
					name: 'Password Reset',
					desc: 'Feeds Authentication Metrics password reset count',
					risk: 'low'
				},
				{
					id: 'trusted_device',
					name: 'Trusted Device',
					desc: 'Feeds Trusted Devices + Overview with low-risk session',
					risk: 'low'
				},
				{
					id: 'api_key_usage',
					name: 'API Key Usage',
					desc: 'Feeds API Security API key usage section',
					risk: 'medium'
				}
			]
		}
	];

	interface ScenarioTestResult {
		scenario: string;
		success: boolean;
		data: { injected: number };
		timestamp: string;
	}

	let loadingScenarios = $state<Set<string>>(new Set());
	let results = $state<ScenarioTestResult[]>([]);
	let error = $state<string>('');
	let broadcastChannel: BroadcastChannel | null = null;

	const riskColors = {
		low: 'bg-blue-100 text-blue-800',
		medium: 'bg-amber-100 text-amber-800',
		high: 'bg-orange-100 text-orange-800',
		critical: 'bg-red-100 text-red-800'
	};

	async function triggerScenario(scenarioId: string) {
		loadingScenarios.add(scenarioId);
		error = '';

		try {
			// First inject the actual security events
			const injectResult = await runSecurityTestScenario({
				scenario: scenarioId,
				action: 'inject'
			});

			results.unshift({
				scenario: scenarioId,
				success: injectResult.success,
				data: { injected: injectResult.injected ?? 0 },
				timestamp: new Date().toLocaleTimeString()
			});

			// Keep only last 10 results
			if (results.length > 10) {
				results = results.slice(0, 10);
			}

			// Trigger a dashboard refresh after a short delay
			setTimeout(() => {
				const detail = { scenario: scenarioId, injected: injectResult.injected };
				window.dispatchEvent(new CustomEvent('security-test-triggered', { detail }));
				localStorage.setItem(
					'security-test-trigger',
					JSON.stringify({ ...detail, ts: Date.now() })
				);
				if (!broadcastChannel && 'BroadcastChannel' in window) {
					broadcastChannel = new BroadcastChannel('security-test-events');
				}
				broadcastChannel?.postMessage(detail);
			}, 500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to trigger scenario';
		} finally {
			loadingScenarios.delete(scenarioId);
		}
	}

	function clearResults() {
		results = [];
		error = '';
	}

	async function triggerMultiple(categoryScenarios: Array<{ id: string }>) {
		for (const scenario of categoryScenarios) {
			await triggerScenario(scenario.id);
			// Small delay between triggers
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
</script>

<svelte:head>
	<title>Security Test Dashboard | Admin</title>
</svelte:head>

<div class="space-y-6">
	<PageHeader
		title="Security Test Dashboard"
		description="Simulate security events to test the monitoring system"
	>
		{#snippet actions()}
			<Button variant="outline" onclick={clearResults} class="gap-2">Clear Results</Button>
		{/snippet}
	</PageHeader>

	{#if error}
		<Alert variant="destructive">
			<AlertTriangle class="h-4 w-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	<!-- Test Results -->
	{#if results.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Shield class="h-5 w-5" />
					Recent Test Results
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each results as result (result.scenario + result.timestamp)}
						<div class="flex items-center justify-between rounded border p-3">
							<div class="flex items-center gap-3">
								<Badge variant={result.success ? 'success' : 'destructive'}>
									{result.scenario}
								</Badge>
								<span class="text-muted-foreground text-sm">{result.timestamp}</span>
							</div>
							<div class="text-right">
								<p class="text-xs">Events injected: {result.data.injected || 0}</p>
								<p class="text-muted-foreground text-xs">
									Status: {result.success ? 'Success' : 'Failed'}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Test Categories -->
	{#each testScenarios as category (category.category)}
		{@const CategoryIcon = category.icon}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<CategoryIcon class="h-5 w-5" />
					{category.category}
				</Card.Title>
				<Card.Description>
					Test scenarios for {category.category.toLowerCase()}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-3 md:grid-cols-2">
					{#each category.scenarios as scenario (scenario.id)}
						<div class="flex items-center justify-between rounded-lg border p-4">
							<div class="flex-1">
								<div class="mb-1 flex items-center gap-2">
									<h4 class="font-medium">{scenario.name}</h4>
									<Badge class={riskColors[scenario.risk as keyof typeof riskColors]}>
										{scenario.risk}
									</Badge>
								</div>
								<p class="text-muted-foreground text-sm">{scenario.desc}</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								onclick={() => triggerScenario(scenario.id)}
								disabled={loadingScenarios.has(scenario.id)}
								class="gap-2"
							>
								{#if loadingScenarios.has(scenario.id)}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else}
									<Play class="h-4 w-4" />
								{/if}
								Trigger
							</Button>
						</div>
					{/each}
				</div>
				<div class="mt-4 border-t pt-4">
					<Button
						variant="secondary"
						size="sm"
						onclick={() => triggerMultiple(category.scenarios)}
						disabled={category.scenarios.some((s) => loadingScenarios.has(s.id))}
					>
						Trigger All {category.category}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}

	<!-- Instructions -->
	<Card.Root class="border-dashed">
		<Card.Content class="pt-6">
			<h3 class="mb-2 font-semibold">How to use:</h3>
			<ol class="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
				<li>Open the Security Dashboard in another tab</li>
				<li>Click "Trigger" on any scenario above to simulate the security event</li>
				<li>Watch the Security Dashboard update in real-time</li>
				<li>Use "Reset Dashboard Data" on the dashboard to reset between tests</li>
			</ol>
			<div class="mt-4 rounded-lg bg-amber-50 p-3">
				<p class="text-sm text-amber-800">
					<strong>Note:</strong> Each button injects one event per click so panel updates are easy to
					verify. Some dashboard sections (like DB-backed 2FA adoption and external system health) use
					real production sources and are not event-injection based.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
