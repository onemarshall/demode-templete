<script lang="ts">
	type Props = {
		label: string;
		href: string;
		linkText: string;
		class?: string;
	};

	let { label, href, linkText, class: className = '' }: Props = $props();
</script>

<p class="text-muted-foreground text-center text-sm {className}">
	{label}
	<a {href} class="text-primary font-medium hover:underline">{linkText}</a>
</p>
