<script>
  import Img from '@zerodevx/svelte-img';
  import Container from '$lib/components/ui/Container.svelte'
  import Headline from '$lib/components/ui/Headline.svelte'
  let { title, subTitleText, hasLink = false, link = '!#', linkText, image, alt } = $props();
</script>

<!-- /////////////// Content Here /////////////// -->
<section class="feature-v5 padding-top-md z-index-3">
  <Container>
  <div class="grid gap-y-xs gap-y-lg@md">
    <div class="col-13@md">
      <Headline headline={title} size="md" />
    </div>
    <div
      class="col-12@md margin-bottom-xl scroll-fx@md js-scroll-fx"
      data-scroll-fx-1="opacity, 0, 1, 3%, 40%"
      data-scroll-fx-2="translateY, 50px, 0px, 0%, 100%"
    >
      <p class="text-xl font-light color-contrast-high line-height-md">
        {subTitleText}
      </p>

      {#if hasLink}
        <div class="margin-top-sm">
          <a class="link" href={link}> {linkText}</a>
        </div>
      {/if}
    </div>
  </div>

  <figure class="width-100% margin-left-auto max-width-md z-index-1">
    <Img class="height-auto block width-100% shadow-lg landscape radius-lg" src={image} {alt} />
  </figure>
  </Container>
</section>
