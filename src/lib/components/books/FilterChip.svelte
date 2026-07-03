<script lang="ts">
	type Props = {
		label: string;
		active?: boolean;
		onclick?: () => void;
	};

	let { label, active = false, onclick }: Props = $props();
</script>

<button
	type="button"
	class="chip"
	class:active
	{onclick}
>
	{label}
</button>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 1rem;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		cursor: pointer;
		border: 1.5px solid #e2e8f0;
		background: white;
		color: #64748b;
		transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
	}

	.chip:hover {
		border-color: #cbd5e1;
		color: #334155;
	}

	.chip.active {
		border-color: transparent;
		background: linear-gradient(135deg, #a5b4fc, #93c5fd, #6ee7b7);
		color: #1e293b;
		font-weight: 600;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
</style>
