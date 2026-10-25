<script lang="ts">
	import CapWidget from '@better-captcha/svelte/provider/cap-widget';
	import type {
		CapWidgetHandle,
		RenderParameters
	} from '@better-captcha/svelte/provider/cap-widget';

	let options = $state<RenderParameters>({});

	let {
		endpoint,
		scriptOptions = {
			// This version supports CSP nonces for instrumentation scripts.
			overrideScriptUrl: 'https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.58'
		},
		onready = undefined,
		onSolve = undefined,
		onerror = undefined,
		class: className = '',
		style = ''
	} = $props();

	let widgetRef: CapWidget | undefined;

	function handleReady(handle: CapWidgetHandle) {
		onready?.(handle);
	}

	function handleSolve(token: string) {
		onSolve?.(token);
	}

	function handleError(err: Error) {
		onerror?.(err);
	}

	// Imperative helpers for consumers that need direct control
	export function execute() {
		return widgetRef?.execute();
	}
	export function reset() {
		return widgetRef?.reset();
	}
	export function destroy() {
		return widgetRef?.destroy();
	}
	export function getResponse() {
		return widgetRef?.getResponse();
	}
	export function getComponentState() {
		return widgetRef?.getComponentState();
	}
	export function render() {
		return widgetRef?.render();
	}
</script>

<CapWidget
	bind:this={widgetRef}
	{endpoint}
	{options}
	{scriptOptions}
	onready={handleReady}
	onSolve={handleSolve}
	onerror={handleError}
	class={className}
	{style}
/>
