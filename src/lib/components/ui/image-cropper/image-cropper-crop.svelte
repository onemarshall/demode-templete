<script lang="ts">
	import { type ButtonProps, Button } from '#lib/components/ui/button/index.js';
	import { useImageCropperCrop } from './image-cropper.svelte.js';
	import CropIcon from '@lucide/svelte/icons/crop';

	let {
		ref = $bindable(null),
		variant = 'default',
		size = 'sm',
		onclick,
		...rest
	}: ButtonProps = $props();

	const cropState = useImageCropperCrop();
</script>

<Button
	{...(rest as Record<string, unknown>)}
	bind:ref
	{size}
	{variant}
	onclick={(e: MouseEvent) => {
		onclick?.(e as never);

		cropState.onclick();
	}}
>
	<CropIcon />
	<span>Crop</span>
</Button>
