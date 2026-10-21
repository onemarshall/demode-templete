<script lang="ts" module>
	export type Props = {
		open: boolean;
		onOpenChange?: (value: boolean) => void;
		onUploadFile?: () => void;
		onImportUrl?: (url: string) => void;
		isUploading?: boolean;
		isImporting?: boolean;
		uploadLabel?: string;
		importLabel?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { FileUp, Link as LinkIcon } from '@lucide/svelte';

	const props: Props = $props();

	const isUploading = $derived(Boolean(props.isUploading));
	const isImporting = $derived(Boolean(props.isImporting));
	const uploadLabel = $derived(props.uploadLabel ?? 'Upload file from device');
	const importLabel = $derived(props.importLabel ?? 'Import file from URL');
	const contentClass = $derived(props.class ? `max-w-md ${props.class}` : 'max-w-md');

	let importUrl = $state('');
	let importError = $state('');

	function handleImport(event: Event) {
		event.preventDefault();
		const importHandler = props.onImportUrl;
		if (!importHandler) {
			return;
		}
		const trimmed = importUrl.trim();
		if (!trimmed) {
			importError = 'Enter an image URL to import.';
			return;
		}
		importError = '';
		importHandler(trimmed);
		importUrl = '';
	}

	const handleOpenChange = (value: boolean) => {
		if (!value) {
			importUrl = '';
			importError = '';
		}
		props.onOpenChange?.(value);
	};
</script>

{#if props.open}
	<Dialog.Root open onOpenChange={handleOpenChange}>
		<Dialog.Content class={contentClass}>
			<Dialog.Header>
				<Dialog.Title>Select avatar source</Dialog.Title>
				<Dialog.Description
					>Choose how you would like to update your profile image.</Dialog.Description
				>
			</Dialog.Header>

			<div class="space-y-6">
				<Button
					type="button"
					variant="outline"
					class="w-full justify-start gap-2"
					onclick={() => props.onUploadFile?.()}
					disabled={isUploading || isImporting}
					aria-busy={isUploading || isImporting}
				>
					<FileUp class="h-4 w-4" />
					{uploadLabel}
				</Button>

				<form class="space-y-3" onsubmit={handleImport}>
					<label class="flex flex-col gap-2 text-sm font-medium">
						<span>Import by URL</span>
						<div class="flex gap-2">
							<div class="relative flex-1">
								<Input
									type="url"
									placeholder="https://example.com/avatar.jpg"
									bind:value={importUrl}
									class={importError ? 'border-destructive' : undefined}
								/>
								<LinkIcon
									class="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
								/>
							</div>
							<Button
								type="submit"
								variant="secondary"
								disabled={isImporting || isUploading}
								aria-busy={isImporting || isUploading}
							>
								{isImporting ? 'Importing…' : importLabel}
							</Button>
						</div>
					</label>

					{#if importError}
						<p class="text-destructive text-sm">{importError}</p>
					{/if}
				</form>
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="ghost"
					class="w-full"
					onclick={() => props.onOpenChange?.(false)}
					aria-busy={isUploading || isImporting}
				>
					Close
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
