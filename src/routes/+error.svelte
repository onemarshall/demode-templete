<script>
	import { page } from "$app/state";
	import { resolve } from "$app/paths";

	let isServerError = $derived(page.status === 500);
	let isNotFound = $derived(page.status === 404);
	let errorMessage = $derived(
		isServerError ? page.error?.message : "Sorry, Page not found",
	);
</script>

<svelte:head>
	<title>{page.status}: {page.error?.message}</title>
</svelte:head>

<section
	class="flex min-h-screen items-center justify-center"
	class:bg-red-50={isServerError}
>
	<div class="w-full max-w-2xl px-4 text-center">
		<h1
			class="text-4xl font-bold uppercase"
			class:text-red-600={isServerError}
		>
			{page.status}: {errorMessage}
		</h1>
		{#if isNotFound}
			<p class="mt-4 text-lg text-gray-600">
				The page you are looking for could not be found.
				Please check the URL and try again.
			</p>
		{/if}
		{#if isServerError}
			<p class="mt-4 text-lg text-gray-600">
				Something went wrong on our end. Please try again
				later.
			</p>
		{/if}
		<div class="mt-8">
			<a
				href={resolve("/")}
				class="inline-flex items-center rounded-md bg-primary-600 px-6 py-3 text-base font-medium text-white transition-colors duration-200 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
			>
				Return to homepage
			</a>
		</div>
	</div>
</section>
