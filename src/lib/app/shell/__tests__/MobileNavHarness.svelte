<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { SidebarNavGroup } from "../../navigation/config";
	import NavGroup from "../nav-group.svelte";

	const sidebar = Sidebar.useSidebar();
	const group: SidebarNavGroup = {
		label: "Account",
		items: [{ title: "Sign-in & security", path: "/auth/security" }]
	};
</script>

<button type="button" onclick={() => sidebar.setOpenMobile(true)}>Open mobile navigation</button>
<output data-testid="mobile-navigation-state">{sidebar.openMobile ? "open" : "closed"}</output>
<NavGroup {...group} />
