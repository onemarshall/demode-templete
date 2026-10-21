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

<div
	class="min-h-screen w-full flex items-center justify-center"
	class:bg-red-50={isServerError}
>
	<div class="w-full max-w-2xl">
		<div class="text-center">
			<h1
				class="text-6xl font-bold text-center uppercase"
				class:text-red-600={isServerError}
			>
				{#if isServerError}
					{page.status}: {errorMessage}
				{:else}
					{page.status}: {errorMessage}
				{/if}
			</h1>
			{#if isNotFound}
				<p class="text-lg text-center mt-4 text-gray-600">
					The page you are looking for could not be found. Please
					check the URL and try again.
				</p>
			{/if}
			{#if isServerError}
				<p class="text-lg text-center mt-4 text-gray-600">
					Something went wrong on our end. Please try again later.
				</p>
			{/if}
			<div class="flex justify-center mt-8">
				<a
					href={resolve("/(pages)")}
					class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
					>Return to homepage</a
				>
			</div>
		</div>
	</div>
</div>
