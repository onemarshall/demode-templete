<script lang="ts">
	interface TextProps {
		content: string;
		class?: string;
		"data-directus"?: string | undefined;
	}

	let {
		content,
		"data-directus": dataDirectus,
		...props
	}: TextProps = $props();
</script>

<div
	class={props.class
		? "prose dark:prose-invert" + props.class
		: "prose dark:prose-invert"}
	data-directus={dataDirectus}
>
	{@html content}
</div>
