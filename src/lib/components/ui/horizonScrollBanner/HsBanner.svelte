<script lang="ts">
  let {
    id = 'Top',
    setting = 'translateX, 500px, 200px, 0%, 100%',
    bg = 'bg-gradient-2',
    theme = '',
    gradient = '',
    rotate = '4',
    size = '3xl',
    children
  } = $props();
  
  function scrollToElement(e: MouseEvent) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<div class="horizon-scroll-banner" style="transform: rotate({rotate}deg);">
  <div
    class="horizon-scroll-banner__title padding-y-sm padding-top-lg@sm padding-bottom-md@sm {bg} scroll-fx js-scroll-fx"
    data-scroll-fx={setting}
    data-theme={theme}
    data-gradient={gradient}
  >
    <a
      href="#{id}"
      onclick={scrollToElement}
      class="text-{size} text-uppercase text-decoration-none"
    >
      {@render children?.()}
    </a>
  </div>
</div>
