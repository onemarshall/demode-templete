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

<div class={props.class} data-directus={dataDirectus}>
	{@html content}
</div>
