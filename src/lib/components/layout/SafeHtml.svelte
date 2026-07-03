<script lang="ts">
	interface Props {
		content: string;
	}

	let { content }: Props = $props();
</script>

<!-- eslint-disable-next-line -->
{@html content}
