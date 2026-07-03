<script lang="ts">
	import DOMPurify from "dompurify";
	import { z } from "zod";
	import SafeHtml from "./SafeHtml.svelte";

	const propsSchema = z.object({
		src: z.string().min(1).nullish(),
		class: z.string().optional().default(""),
		fill: z.string().optional(),
	});

	interface Props {
		src?: string | null;
		class?: string;
		fill?: string;
	}

	let { src, class: className = "", fill }: Props = $props();
	const validatedProps = $derived(
		propsSchema.parse({ src, class: className, fill }),
	);

	let svgContent = $state("");
	let isLoading = $state(true);

	const applySvgAttributes = (
		svgMarkup: string,
		svgClass: string,
		svgFill?: string,
	) => {
		const parser = new DOMParser();
		const document = parser.parseFromString(svgMarkup, "image/svg+xml");
		const svg = document.querySelector("svg");

		if (!svg) {
			return "";
		}

		const existingClass = svg.getAttribute("class");
		const mergedClass = [existingClass, svgClass]
			.filter(Boolean)
			.join(" ")
			.trim();

		if (mergedClass) {
			svg.setAttribute("class", mergedClass);
		}

		if (svgFill) {
			svg.setAttribute("fill", svgFill);
			svg.setAttribute("color", svgFill);
		}

		const descendants = svg.querySelectorAll("*");
		for (const node of descendants) {
			if (!(node instanceof SVGElement)) continue;

			const nodeFill = node.getAttribute("fill");
			if (nodeFill && nodeFill !== "none") {
				node.removeAttribute("fill");
			}

			const stroke = node.getAttribute("stroke");
			if (stroke && stroke !== "none") {
				node.removeAttribute("stroke");
			}

			const style = node.getAttribute("style");
			if (style) {
				const cleanedStyle = style
					.replace(/fill\s*:\s*[^;]+;?/gi, "")
					.replace(/stroke\s*:\s*[^;]+;?/gi, "")
					.trim();
				if (cleanedStyle) {
					node.setAttribute("style", cleanedStyle);
				} else {
					node.removeAttribute("style");
				}
			}
		}

		return svg.outerHTML;
	};

	$effect(() => {
		if (!validatedProps.src) {
			svgContent = "";
			isLoading = false;
			return;
		}

		const abortController = new AbortController();
		isLoading = true;

		fetch(validatedProps.src, { signal: abortController.signal })
			.then((response) => response.text())
			.then((content) => {
				const parsedContent = z.string().parse(content);
				const svgMatch = parsedContent.match(
					/<svg[^>]*>[\s\S]*?<\/svg>/,
				);

				if (!svgMatch) {
					svgContent = "";
					return;
				}

				const cleanSvg = DOMPurify.sanitize(svgMatch[0], {
					USE_PROFILES: { svg: true, svgFilters: true },
				});

				svgContent = applySvgAttributes(
					cleanSvg,
					validatedProps.class,
					validatedProps.fill,
				);
			})
			.catch((error: unknown) => {
				if (
					error instanceof DOMException &&
					error.name === "AbortError"
				) {
					return;
				}

				console.error("Failed to fetch SVG:", error);
				svgContent = "";
			})
			.finally(() => {
				if (!abortController.signal.aborted) {
					isLoading = false;
				}
			});

		return () => {
			abortController.abort();
		};
	});
</script>

{#if svgContent}
	<SafeHtml content={svgContent} />
{:else if isLoading}
	<div class={validatedProps.class}></div>
{/if}
