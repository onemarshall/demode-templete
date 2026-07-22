<script lang="ts">
	import { fade } from 'svelte/transition';
	import './styles.css';

	let { type = 'default', message = '', dismissible = false }: { type: 'default' | 'success' | 'error' | 'warning', message?: string, dismissible?: boolean } = $props();
	let visible = $state(true);

	const icons = {
		default: `<path d="M12 9a1 1 0 0 1 1 1v9a1 1 0 0 1-2 0v-9a1 1 0 0 1 1-1zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 1 0 0 3z" />`,
		success: `<path d="M9.5 17a1 1 0 0 1-.707-.293l-3-3a1 1 0 0 1 1.414-1.414L9.5 14.586l7.293-7.293a1 1 0 1 1 1.439 1.389l-.025.025-8 8A1 1 0 0 1 9.5 17z" />`,
		error: `<path d="M12 13.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1zm0 3.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 1 0 0 3z" />`,
		warning: `<path d="M12 13.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1zm0 3.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 1 0 0 3z" />`
	};

	function handleClose() {
		visible = false;
	}

	let iconPath = $derived(icons[type] || icons.default);
	let typeUpperCase = $derived(type.charAt(0).toUpperCase() + type.slice(1));
</script>

{#if visible}
	<div
		class="alert alert--{type} alert--is-visible padding-sm radius-md text-sm"
		role="alert"
		transition:fade
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<svg
					class="alert__icon icon icon--sm margin-right-2xs"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<g fill="currentColor">
						<circle cx="12" cy="12" r="12" opacity=".2" />
						{@html iconPath}
					</g>
				</svg>

				<p>
					<strong class="font-bold">{typeUpperCase}:</strong>
					{message}
				</p>
			</div>

			{#if dismissible}
				<button
					class="alert__close-btn margin-left-sm"
					onmousedown={handleClose}
					aria-label="Alert"
				>
					<svg class="icon icon--xs" viewBox="0 0 16 16">
						<g
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						>
							<path d="M3 3l10 10M13 3L3 13" />
						</g>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
