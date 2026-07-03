<script lang="ts">
	import { Input } from '$lib/components/ui/input'
	import type { SuperForm } from 'sveltekit-superforms'

	interface FileUploadFieldProps {
		name: string
		form: SuperForm<Record<string, unknown>>
	}

	const { name, form }: FileUploadFieldProps = $props()

	const { form: formData } = $derived(form)

	const onFileChange = (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0]
		$formData[name] = file
	}
</script>

<Input type="file" id={name} onchange={onFileChange} />
