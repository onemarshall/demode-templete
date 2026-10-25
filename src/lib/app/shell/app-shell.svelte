<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import AppHeader from "./app-header.svelte";
	import AppSidebar from "./app-sidebar.svelte";
	import type { ShellUser } from "../navigation/config";

	let { user = null, children }: { user?: ShellUser | null; children: Snippet } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar {user} />
	<Sidebar.Inset>
		<AppHeader {user} />
		<div
			class={cn(
				"flex flex-1 flex-col p-4 md:p-6",
				"mx-auto w-full bg-background max-w-(--app-wrapper-max-width)"
			)}
		>
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
