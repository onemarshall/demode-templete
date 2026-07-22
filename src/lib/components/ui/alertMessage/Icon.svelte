<!-- Icon.svelte -->
<script>
  /**
   * @typedef {Object} Props
   * @property {any} name
   * @property {string} [size]
   */

  /** @type {Props} */
  let { name, size = '2xs' } = $props();
</script>

<svg
  class={`icon icon--${size} margin-left-3xs`}
  viewBox="0 0 12 12"
  aria-hidden="true"
  fill="none"
  stroke="currentColor"
  stroke-linecap="round"
  stroke-linejoin="round"
  stroke-width="1.5"
>
  {#if name === 'close'}
    <line x1="1" y1="1" x2="11" y2="11" />
    <line x1="11" y1="1" x2="1" y2="11" />
  {/if}
</svg>
