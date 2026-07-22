<script lang="ts">
	import './styles.css';

	let { type = 'default', title = 'Note', content = '' } = $props();

	const icon = $derived.by(() => {
		switch (type) {
			case 'default':
				return `
          <circle cx="15" cy="15" r="14" fill="var(--color-primary)" opacity=".2"></circle>
          <path fill="none" stroke="var(--color-primary)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13v9"></path>
          <circle cx="15" cy="8.5" r="1.5" fill="var(--color-primary)"></circle>
        `;
			case 'warning':
				return `
          <path d="M12.4 2.563L.377 24.518A3.023 3.023 0 0 0 3.006 29h23.987a3.023 3.023 0 0 0 2.632-4.477L17.66 2.569a2.992 2.992 0 0 0-5.26-.006z" fill="var(--color-warning)" opacity=".25"></path>
          <path fill="none" stroke="var(--color-warning)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19v-9"></path>
          <circle cx="15" cy="23.5" r="1.5" fill="var(--color-warning)"></circle>
        `;
			case 'error':
				return `
          <path d="M28.707 8.908l-7.615-7.615A1 1 0 0 0 20.385 1H9.615a1 1 0 0 0-.707.293L1.293 8.908A1 1 0 0 0 1 9.615v10.77a1 1 0 0 0 .293.707l7.615 7.615a1 1 0 0 0 .707.293h10.77a1 1 0 0 0 .707-.293l7.615-7.615a1 1 0 0 0 .293-.707V9.615a1 1 0 0 0-.293-.707z" fill="var(--color-error)" opacity=".2"></path>
          <path fill="none" stroke="var(--color-error)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17V8"></path>
          <circle cx="15" cy="21.5" r="1.5" fill="var(--color-error)"></circle>
        `;
			case 'success':
				return `
          <circle cx="15" cy="15" r="14" fill="var(--color-success)" opacity=".2"></circle>
          <path fill="none" stroke="var(--color-success)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 15l4 4 8-8"></path>
        `;
			default:
				return '';
		}
	});
</script>

<aside class="note" data-note-type={type}>
	<div class="flex items-center">
		<svg class="icon icon--md margin-right-sm" aria-hidden="true" viewBox="0 0 30 30">
			{@html icon}
		</svg>
		<h3 class="text-md color-contrast-higher"><strong class="font-bold">{title}</strong></h3>
	</div>

	<div class="flex">
		<!-- spacer - occupy same space of icon above  -->
		<svg class="icon icon--md margin-right-sm" aria-hidden="true"></svg>

		<div class="note__content text-component">
			{@html content}
		</div>
	</div>
</aside>
