<script lang="ts">
	import { openCookiePreferences } from './api'

	interface Props {
		className?: string
		label?: string
	}

	let { className = '', label = 'Cookie Preferences' }: Props = $props()
</script>

<button type="button" class={className} onclick={openCookiePreferences}>
	{label}
</button>
