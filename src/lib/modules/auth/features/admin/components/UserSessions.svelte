<script lang="ts">
	import type { UserSessionsProps } from '../shared/types';

	let { sessions = [], onRevoke }: UserSessionsProps = $props();

	function handleRevoke(token: string) {
		onRevoke?.(token);
	}

	function maskToken(token: string): string {
		if (token.length <= 12) {
			return `${token.slice(0, 4)}•••`;
		}
		return `${token.slice(0, 8)}•••${token.slice(-4)}`;
	}

	function formatDateTime(date: string | Date | null | undefined): string {
		if (!date) return '—';
		try {
			return new Date(date).toLocaleString();
		} catch {
			return '—';
		}
	}

	function isExpired(expiresAt: string | Date | null | undefined): boolean {
		if (!expiresAt) return false;
		try {
			return new Date(expiresAt) < new Date();
		} catch {
			return false;
		}
	}
</script>

<div class="bg-card text-card-foreground rounded-lg border shadow-sm">
	<div class="flex items-center justify-between border-b px-4 py-3">
		<div>
			<p class="text-muted-foreground text-xs tracking-wide uppercase">Sessions</p>
			<p class="text-lg font-semibold">Active sessions</p>
		</div>
		{#if sessions.length > 0}
			<span class="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
				{sessions.length}
			</span>
		{/if}
	</div>
	{#if sessions.length === 0}
		<div class="text-muted-foreground px-4 py-6 text-sm">No active sessions.</div>
	{:else}
		<div class="divide-y">
			{#each sessions as session (session.token)}
				<div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
					<div class="min-w-0 flex-1 space-y-1">
						<div class="flex items-center gap-2">
							<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
								{maskToken(session.token)}
							</code>
							{#if isExpired(session.expiresAt)}
								<span class="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs">
									Expired
								</span>
							{/if}
						</div>
						<div class="text-muted-foreground text-xs">
							Created: {formatDateTime(session.createdAt)}
						</div>
						<div class="text-muted-foreground text-xs">
							Expires: {formatDateTime(session.expiresAt)}
						</div>
						{#if session.impersonatedBy}
							<div class="flex items-center gap-1 text-xs text-amber-600">
								<svg
									class="h-3 w-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								Impersonated by {session.impersonatedBy}
							</div>
						{/if}
					</div>
					<button
						type="button"
						class="text-destructive hover:bg-destructive/10 rounded px-2 py-1 text-xs font-medium transition-colors hover:underline"
						onclick={() => handleRevoke(session.token)}
					>
						Revoke
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
