<script>
  import './styles.css';

  let {
    bg,
    id = 'top',
    setting = 'translateX, 500px, 200px, 0%, 100%',
    theme = '',
    rotate = '4',
    size = '5xl',
    children
  } = $props();
  
  function scrollToElement() {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
</script>

<div class="horizon-scroll-banner" style="transform: rotate({rotate}deg);">
  <div
    class="horizon-scroll-banner__title scroll-fx js-scroll-fx padding-y-sm padding-y-sm@sm {bg}"
    data-scroll-fx={setting}
    data-theme={theme}
  >
    <button
      onclick={scrollToElement}
      class="reset text-{size} line-height-xs text-decoration-none"
    >
      {@render children?.()}
    </button>
  </div>
</div>
