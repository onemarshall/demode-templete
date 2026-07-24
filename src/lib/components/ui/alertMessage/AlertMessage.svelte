<script>
	import './style.css';
	import { createEventDispatcher, onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import { getCookie, setCookie } from '$lib/utils/cookies';

	let {
		alertID,
		title = 'Alert Message',
		description = 'Message description...',
		cookieName = 'alertMessageDismissed',
		cookieExpires = 30
	} = $props();

	const dispatch = createEventDispatcher();

	let showAlert = $state();

	const closeModal = () => {
		showAlert = false;
		setCookie(cookieName, 'true', cookieExpires);
		dispatch('closeModal');
	};

	onMount(() => {
		const cookieValue = getCookie(cookieName);
		showAlert = !cookieValue; // Update showAlert based on the cookie value on the client-side
	});
</script>

{#if showAlert === true}
	<div
		class="modal modal--animate-translate-up modal--is-visible alert-msg flex items-end justify-end pointer-events-none js-modal"
		id={alertID}
		role="dialog"
		aria-labelledby="alert-msg-title"
		aria-describedby="alert-msg-descr"
	>
		<div class="modal__content max-height-100% flex flex-col padding-md">
			<div class="Right">
				<button
					class="alert-msg__close-btn pointer-events-auto radius-full shadow-md text-sm js-modal__close"
					onmousedown={closeModal}
				>
					<span>Close</span>
					<Icon name="close" size="2xs" />
				</button>
			</div>

			<div
				class="pointer-events-auto width-100% max-width-3xs padding-sm bg radius-md shadow-md overflow-auto"
			>
				<div class="text-componen text-sm">
					<h3 id="alert-msg-title" class="text-md">{title}</h3>
					<p id="alert-msg-descr" class="color-contrast-medium">{description}</p>
				</div>
			</div>
		</div>
	</div>
{/if}
