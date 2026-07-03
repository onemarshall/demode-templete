<script lang="ts">
    import DirectusImage from "$lib/components/shared/DirectusImage.svelte";

    interface Props {
        title: string;
        author: string;
        year: string;
        blurb: string;
        color?: string;
        image?: string | null;
        selected?: boolean;
        onclick?: () => void;
    }

    let {
        title,
        author,
        year,
        blurb,
        color = "#94a3b8",
        image = null,
        selected = false,
        onclick,
    }: Props = $props();
</script>

<button
    type="button"
    class="group flex w-full h-full cursor-pointer flex-col overflow-hidden rounded-sm border-[1.5px] border-slate-200 bg-white p-0 text-left font-[inherit] transition-[box-shadow,transform,border-color] duration-300 ease-in-out hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 {selected
        ? 'border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
        : ''}"
    {onclick}
>
    <div
        class="relative flex aspect-3/4 items-end justify-end overflow-hidden p-3 after:absolute after:inset-0 after:bg-linear-to-t after:from-black/15 after:to-transparent after:to-50%"
        style="background-color: {color};"
    >
        {#if image}
            <div
                class="absolute inset-0 size-full [&_img]:size-full [&_img]:object-contain!"
            >
                <DirectusImage
                    uuid={image}
                    alt={title}
                    layout="fullWidth"
                    fill
                    maxWidth={400}
                />
            </div>
        {/if}
        <span
            class="relative z-1 text-[0.7rem] font-medium tracking-wide text-white/70"
            >{year}</span
        >
    </div>
    <div class="flex min-h-[15em] flex-1 flex-col px-4 pt-4 pb-5">
        <h3 class="mb-3.5 font-serif text-xl leading-[1.35] text-slate-800">
            {title}
        </h3>

        <div class="prose line-clamp-3 text-sm leading-6 text-gray-600">
            {@html blurb}
        </div>
        <p class="mt-auto text-sm tracking-[0.01em] text-slate-400">{author}</p>
        <span
            class="mt-3 text-xs font-medium text-primary transition-colors group-hover:text-primary-700"
            >View details &rarr;</span
        >
    </div>
</button>
