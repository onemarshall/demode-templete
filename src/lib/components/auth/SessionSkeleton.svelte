<!-- src/lib/components/auth/SessionSkeleton.svelte -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="container mx-auto max-w-6xl space-y-6 p-6">
	<!-- Header skeleton -->
	<div class="space-y-2">
		<Skeleton class="h-9 w-64" />
		<Skeleton class="h-5 w-96" />
	</div>

	<!-- Actions skeleton -->
	<div class="flex gap-4">
		<Skeleton class="h-10 w-32" />
		<Skeleton class="h-10 w-24" />
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- User Info Skeleton -->
		<Card.Root>
			<Card.Header>
				<Skeleton class="h-6 w-40" />
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-center space-x-4">
					<Skeleton class="h-16 w-16 rounded-full" />
					<div class="space-y-2">
						<Skeleton class="h-5 w-32" />
						<Skeleton class="h-4 w-48" />
						<Skeleton class="h-5 w-20" />
					</div>
				</div>

				<div class="space-y-3">
					{#each Array(5) as _}
						<div class="grid grid-cols-3 gap-4">
							<Skeleton class="h-4 w-20" />
							<Skeleton class="col-span-2 h-4 w-36" />
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Session Info Skeleton -->
		<Card.Root>
			<Card.Header>
				<Skeleton class="h-6 w-44" />
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each Array(6) as _}
					<div class="grid grid-cols-3 gap-4">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="col-span-2 h-4 w-40" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Actions Card Skeleton -->
	<Card.Root>
		<Card.Header>
			<Skeleton class="h-6 w-24" />
		</Card.Header>
		<Card.Content>
			<div class="flex gap-3">
				<Skeleton class="h-10 w-24" />
				<Skeleton class="h-10 w-32" />
				<Skeleton class="h-10 w-36" />
			</div>
		</Card.Content>
	</Card.Root>
</div>
