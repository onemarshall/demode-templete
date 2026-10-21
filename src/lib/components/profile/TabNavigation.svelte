<!-- src/routes/auth/profile/components/TabNavigation.svelte -->
<script lang="ts">
	import { CheckCircle, XCircle, Shield } from "@lucide/svelte";

	interface Props {
		activeTab: "profile" | "security";
		user: any;
		onTabChange: (tab: "profile" | "security") => void;
	}

	let { activeTab, user, onTabChange }: Props = $props();

	function handleTabKeydown(
		event: KeyboardEvent,
		nextTab: "profile" | "security",
	) {
		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				onTabChange(activeTab === "profile" ? "security" : "profile");
				break;
			case "ArrowRight":
				event.preventDefault();
				onTabChange(activeTab === "profile" ? "security" : "profile");
				break;
			case "Home":
				event.preventDefault();
				onTabChange("profile");
				break;
			case "End":
				event.preventDefault();
				onTabChange("security");
				break;
			case "Enter":
			case " ":
				event.preventDefault();
				onTabChange(nextTab);
				break;
		}
	}
</script>

<div class="border-b" role="tablist" aria-label="Account settings">
	<div class="-mb-px flex space-x-8">
		<button
			id="profile-tab"
			type="button"
			role="tab"
			aria-selected={activeTab === "profile"}
			aria-controls="profile-panel"
			class="border-b-2 px-1 py-4 text-sm font-medium transition-colors {activeTab ===
			'profile'
				? 'border-primary text-foreground'
				: 'text-muted-foreground hover:border-muted-foreground/50 border-transparent'}"
			onclick={() => onTabChange("profile")}
			onkeydown={(e) => handleTabKeydown(e, "security")}
			tabindex={activeTab === "profile" ? 0 : -1}
		>
			<div class="flex items-center gap-2">
				{#if user?.emailVerified}
					<CheckCircle class="h-4 w-4 text-green-500" />
				{:else}
					<XCircle class="h-4 w-4 text-red-500" />
				{/if}
				<span>Profile</span>
			</div>
		</button>
		<button
			id="security-tab"
			type="button"
			role="tab"
			aria-selected={activeTab === "security"}
			aria-controls="security-panel"
			class="border-b-2 px-1 py-4 text-sm font-medium transition-colors {activeTab ===
			'security'
				? 'border-primary text-foreground'
				: 'text-muted-foreground hover:border-muted-foreground/50 border-transparent'}"
			onclick={() => onTabChange("security")}
			onkeydown={(e) => handleTabKeydown(e, "profile")}
			tabindex={activeTab === "security" ? 0 : -1}
		>
			<div class="flex items-center gap-2">
				<Shield class="h-4 w-4" />
				<span>Security</span>
			</div>
		</button>
	</div>
</div>
