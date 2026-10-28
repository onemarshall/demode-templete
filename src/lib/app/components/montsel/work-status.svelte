<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { WorkState } from '#lib/modules/products/shared/access.js';
	import { workStateLabel } from '#lib/modules/products/shared/access.js';

	let { state }: { state: WorkState } = $props();

	const variant = $derived(
		state === 'completed'
			? 'outline'
			: state === 'awaiting_decision'
				? 'warning'
				: state === 'in_progress'
					? 'secondary'
					: 'ghost'
	);
</script>

<Badge {variant}>{workStateLabel(state)}</Badge>
