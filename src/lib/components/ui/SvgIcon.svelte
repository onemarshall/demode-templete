<script lang="ts">
  interface Props {
    src: string;
    class?: string;
    fill?: string;
    width?: string | number;
    height?: string | number;
  }

  let { src, class: className = "", fill, width, height, ...props }: Props = $props();
</script>

<img 
  {src}
  class={className}
  {fill}
  {width}
  {height}
  alt=""
  {...$$restProps}
/>
