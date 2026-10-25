// Minimal fallback implementation for behavior collection
// Replace with real logic as needed.

export type BehaviorPatternPayload = {
	events: unknown[];
};

export function createBehaviorCollector() {
	const events: unknown[] = [];

	function start() {
		// no-op stub
	}

	function stop() {
		// no-op stub
	}

	function getData(): BehaviorPatternPayload {
		return { events: [...events] };
	}

	function getSnapshot(): BehaviorPatternPayload {
		return getData();
	}

	return { start, stop, getData, getSnapshot };
}
