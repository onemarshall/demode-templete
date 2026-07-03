<script lang="ts">
	let {
		date = "5 July 2025",
		title = "Transatlantic partnership boosts Oxford Summer School on Animal Ethics",
		href = "#",
	}: { date?: string; title?: string; href?: string } = $props();
</script>

<a
	{href}
	class="group flex h-96 w-72 shrink-0 flex-col overflow-hidden rounded-sm bg-gray-50 no-underline shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg"
>
	<div class="flex-1 px-6 pt-6 pb-12">
		<time class="text-sm font-medium text-gray-400">{date}</time>
		<h3 class="mt-3 text-2xl leading-tight font-semibold text-gray-900">
			{title}
		</h3>
	</div>
	<div
		class="relative flex h-32 items-end justify-end overflow-hidden p-5"
		style="background: linear-gradient(to bottom right, #a5b4fc, #93c5fd, #6ee7b7);"
	>
		<span
			class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-white transition-all duration-200 ease-out group-hover:border-white/60 group-hover:bg-white/30"
			aria-hidden="true"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M9 18L15 12L9 6"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
	</div>
</a>
