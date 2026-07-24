<script lang="ts">
	import { submitGenericForm } from "$lib/services/forms/remote/generic.remote";

	interface Props {
		heading?: string;
		formId?: string;
		successMessage?: string;
		label?: string;
	}

	const NEWSLETTER_FORM_ID = "5da3d356-d818-434f-b225-db35c418bbb6";

	let {
		heading = "Join us and get the latest\nnews delivered to your inbox",
		formId = NEWSLETTER_FORM_ID,
		successMessage = "Check your inbox for a confirmation email.",
		label = "Get notified when we launch",
	}: Props = $props();

	let subscribed = $state(false);
	let submissionMessage = $state("");
	let email = $state("");
	let isSubmitting = $state(false);

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		if (isSubmitting || !email) return;
		isSubmitting = true;
		try {
			await submitGenericForm({
				formId,
				submissionData: { email },
			});
			subscribed = true;
			submissionMessage = successMessage;
		} catch {
			submissionMessage = "Something went wrong. Please try again.";
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div>
	{#if heading}
		<h3 class="text-xl font-semibold mb-5 leading-snug text-balance">
			{#each heading.split("\n") as line, i (i)}
				{#if i > 0}<br />{/if}{line}
			{/each}
		</h3>
	{/if}

	{#if subscribed}
		<div
			role="alert"
			class="news-form__msg news-form__msg--success p-2 lg:p-3 rounded text-sm lg:text-base"
		>
			<p><strong>Success!</strong> {submissionMessage}</p>
		</div>
	{:else}
		<form class="news-form js-news-form" onsubmit={handleSubmit}>
			<label
				class="inline-block text-sm lg:text-base mb-2 lg:mb-3"
				for="news-input-name"
			>
				{label}
			</label>

			<div class="news-form__wrapper">
				<input
					bind:value={email}
					class="news-form__input js-news-form__input"
					type="email"
					placeholder="Email"
					id="news-input-name"
					required
					disabled={isSubmitting}
				/>

				<button
					class="news-form__btn"
					type="submit"
					disabled={isSubmitting}
				>
					<span>Notify me</span>

					<span>
						<svg class="news-form__icon" viewBox="0 0 24 24">
							<path
								class="news-form__icon-circle"
								d="M2,12a10,10,0,0,0,20,0"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
							/>
							<path
								class="news-form__icon-check"
								d="M2,12l6,6L22,4"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
							/>
							<line
								class="news-form__icon-excl-line"
								x1="12"
								y1="2"
								x2="12"
								y2="16"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
							/>
							<circle
								class="news-form__icon-excl-dot"
								cx="12"
								cy="21.5"
								r="1.5"
								fill="currentColor"
							/>
						</svg>
					</span>
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	/* --------------------------------

File#: _1_newsletter-input
Title: Newsletter Input
Descr: Animated newsletter input
Usage: codyhouse.co/license

-------------------------------- */
	:root {
		--news-form-input-height: 48px;
		--news-form-input-padding-x: 18px;
		--news-form-input-radius: 50em;
		--news-form-btn-margin: 4px;
		--news-form-btn-padding-x: 16px;
		--news-form-icon-size: 24px;
	}

	.news-form__wrapper {
		position: relative;
	}

	.news-form__input {
		background-color: transparent;
		color: white;
		padding: 0 calc(var(--news-form-btn-padding-x) * 7) 0
			var(--news-form-input-padding-x);
		border: 1px solid rgb(255 255 255 / 0.3);
		border-radius: var(--news-form-input-radius);
		width: 100%;
		height: var(--news-form-input-height);
		transition: 0.2s;
	}
	.news-form__input::placeholder {
		color: rgb(255 255 255 / 0.55);
	}
	.news-form__input:focus {
		outline: none;
		background-color: transparent;
		border-color: white;
	}
	/* Override the browser's blue/yellow autofill background so it matches the dark theme */
	.news-form__input:-webkit-autofill,
	.news-form__input:-webkit-autofill:hover,
	.news-form__input:-webkit-autofill:focus,
	.news-form__input:-webkit-autofill:active {
		-webkit-text-fill-color: white;
		caret-color: white;
		transition: background-color 5000s ease-in-out 0s;
		box-shadow: 0 0 0 1000px transparent inset;
	}

	.news-form__btn {
		display: inline-block;
		overflow: hidden;
		position: absolute;
		top: var(--news-form-btn-margin);
		right: var(--news-form-btn-margin);
		height: calc(
			var(--news-form-input-height) - 2 * var(--news-form-btn-margin)
		);
		padding: 0 var(--news-form-btn-padding-x);
		background-color: white;
		color: rgb(17 24 39);
		border-radius: calc(var(--news-form-input-radius) * 0.85);
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		cursor: pointer;
		transition: 0.2s;
	}
	.news-form__btn:hover:not(:disabled) {
		background-color: rgb(255 255 255 / 0.85);
	}
	.news-form__btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.news-form__btn > * {
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: transform 0.3s cubic-bezier(0.215, 0.61, 0.355, 1);
	}
	.news-form__btn > *:last-child {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transform: translateY(100%);
	}

	.news-form__icon {
		display: block;
		width: var(--news-form-icon-size);
		height: var(--news-form-icon-size);
	}
	.news-form__icon > * {
		transform-origin: 50% 50%;
	}

	.news-form__icon-circle {
		stroke-dashoffset: 160;
		stroke-dasharray: 32;
	}

	.news-form__icon-check {
		stroke-dashoffset: 30;
		stroke-dasharray: 30;
	}

	.news-form__icon-excl-line {
		stroke-dashoffset: 14;
		stroke-dasharray: 14;
	}

	.news-form__icon-excl-dot {
		transform-origin: 12px 21.5px;
		transform: scale(0);
	}

	.news-form__msg {
		background-color: rgb(45 212 191);
		color: rgb(17 24 39);
	}
</style>
