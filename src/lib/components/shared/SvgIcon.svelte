<script lang="ts">
  interface Props {
    src: string;
    class?: string;
    width?: string | number;
    height?: string | number;
    [key: string]: unknown;
  }

  let {
    src,
    class: className = "",
    width,
    height,
    ...restProps
  }: Props = $props();
</script>

<img {src} class={className} {width} {height} alt="" {...restProps} />
