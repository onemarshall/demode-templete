<script lang="ts">
	import { type ButtonProps, Button } from '#lib/components/ui/button/index.js';
	import { useImageCropperCancel } from './image-cropper.svelte.js';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	let {
		ref = $bindable(null),
		variant = 'outline',
		size = 'sm',
		onclick,
		...rest
	}: ButtonProps = $props();

	const cancelState = useImageCropperCancel();
</script>

<Button
	{...(rest as Record<string, unknown>)}
	bind:ref
	{size}
	{variant}
	onclick={(e: MouseEvent) => {
		onclick?.(e as never);

		cancelState.onclick();
	}}
>
	<Trash2Icon />
	<span>Cancel</span>
</Button>
