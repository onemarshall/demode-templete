<script lang="ts">
	/**
	 * Warns before leaving a page with unsaved work.
	 *
	 * Uses the browser's own dialog: it cannot be styled, but it is the only
	 * prompt that reliably interrupts a close or a back navigation.
	 */
	let {
		active = true,
		message = 'Your Visual Contract is not saved to an account yet. Leave without saving?'
	}: { active?: boolean; message?: string } = $props();

	$effect(() => {
		if (!active) return;

		const handler = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Older browsers read returnValue; modern ones show their own copy.
			event.returnValue = message;
			return message;
		};

		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});
</script>
