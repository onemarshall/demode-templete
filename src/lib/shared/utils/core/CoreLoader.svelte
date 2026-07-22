<div
	class="loader fixed inset-0 z-3002 grid h-full w-full place-items-center bg-gray-950 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	<div class="Alert">
		<p class="sr-only">Content is loading...</p>
		<div class="relative inline-block size-16" aria-hidden="true">
			<div
				class="absolute inset-0 rounded-full bg-primary/80 motion-safe:animate-[circle-loader_1.2s_ease-out_infinite]"
			></div>
			<div
				class="absolute inset-0 rounded-full bg-primary/80 motion-safe:animate-[circle-loader_1.2s_ease-out_infinite] [animation-delay:0.6s]"
			></div>
		</div>
	</div>
</div>

<style>
	:global(body.is-loaded) .loader {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	@keyframes -global-circle-loader {
		from {
			transform: scale(0);
			opacity: 0.8;
		}
		to {
			transform: scale(1);
			opacity: 0;
		}
	}
</style>
