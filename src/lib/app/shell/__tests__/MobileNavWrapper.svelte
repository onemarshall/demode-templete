<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import MobileNavHarness from "./MobileNavHarness.svelte";
</script>

<Sidebar.Provider>
	<MobileNavHarness />
</Sidebar.Provider>
