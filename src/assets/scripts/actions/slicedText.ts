import { gsap } from './gsap';
import type { Action } from 'svelte/action';

export type SlicedTextEffect = 1 | 2 | 3 | 4 | 5 | 6;

export interface SlicedTextOptions {
	/** Effect variant (1–6). Default: 1 */
	effect?: SlicedTextEffect;
	/** Number of cell slices. Defaults: effects 1–3 → 4, effects 4–6 → 6 */
	cells?: number;
}

/**
 * Sliced text scroll effect — splits element text into N overlapping cells
 * that animate from offset positions to aligned on scroll.
 *
 * Usage:
 *   <h2 use:slicedText>Headline</h2>
 *   <h2 use:slicedText={{ effect: 3, cells: 6 }}>Headline</h2>
 *
 * The element must have a font-size set (via class or style) for the layout
 * to measure correctly.
 */
export const slicedText: Action<HTMLElement, SlicedTextOptions | undefined> = (node, options = {}) => {
	const { effect = 1 } = options;
	const totalCells = options.cells ?? (effect <= 3 ? 4 : 6);
	const text = node.textContent?.trim() ?? '';

	// Build layout: N clones of the text, each visible through its overflow-hidden cell
	let html = '';
	for (let i = 0; i < totalCells; i++) {
		html += `<span class="st-box"><span class="st-box-inner">${text}</span></span>`;
	}
	node.innerHTML = html;

	const boxes = Array.from(node.querySelectorAll<HTMLElement>('.st-box'));
	const inners = Array.from(node.querySelectorAll<HTMLElement>('.st-box-inner'));

	// Apply the critical layout styles (mirrors .gtext / .gtext__box / .gtext__box-inner from the source)
	Object.assign(node.style, { display: 'grid', whiteSpace: 'nowrap', lineHeight: '1', margin: '0' });
	boxes.forEach((el) => Object.assign(el.style, { overflow: 'hidden', position: 'relative', willChange: 'transform', marginRight: '-0.5px' }));
	inners.forEach((el) => Object.assign(el.style, { width: 'max-content', position: 'relative', display: 'block', willChange: 'transform' }));

	function updateLayout() {
		const cellWidth = parseFloat(window.getComputedStyle(inners[0]).width) / totalCells;
		node.style.gridTemplateColumns = `repeat(${totalCells}, ${cellWidth}px)`;
		inners.forEach((el, i) => gsap.set(el, { left: cellWidth * -i }));
	}

	updateLayout();
	window.addEventListener('resize', updateLayout);

	const half = totalCells / 2;
	let tl: { kill(): void } | null = null;

	switch (effect) {
		case 1:
			tl = gsap.fromTo(
				inners,
				{ xPercent: (i: number) => (i < half ? -13 * i - 13 : 13 * (i - half) + 13) },
				{ ease: 'power1', xPercent: 0, scrollTrigger: { trigger: node, start: 'top bottom', end: 'top top+=10%', scrub: true } }
			);
			break;

		case 2:
			tl = gsap
				.timeline({ defaults: { ease: 'power1' }, scrollTrigger: { trigger: node, start: 'top bottom', end: 'top top+=10%', scrub: true } })
				.fromTo(inners, { xPercent: (i: number) => 30 * i }, { xPercent: 0 }, 0)
				.fromTo(boxes, { xPercent: (i: number) => 2 * (i + 1) * 10 }, { xPercent: 0 }, 0);
			break;

		case 3: {
			const step = 100;
			const center = ((totalCells - 1) * step) / 2;
			tl = gsap
				.timeline({ defaults: { ease: 'power1' }, scrollTrigger: { trigger: node, start: 'top bottom', end: 'top top+=10%', scrub: true } })
				.fromTo(
					inners,
					{
						xPercent: (i: number) => (i < half ? -30 * i - 30 : 30 * (i - half) + 30),
						yPercent: (i: number) => (i < half ? -15 * (half - i) : -15 * (i + 1 - half))
					},
					{ xPercent: 0, yPercent: 0 },
					0
				)
				.fromTo(
					boxes,
					{
						xPercent: (i: number) => i * step - center,
						rotationZ: (i: number) => (i < half ? -5 * (half - i) - 5 : 5 * (i - half) + 5)
					},
					{ xPercent: 0, rotationZ: 0 },
					0
				);
			break;
		}

		case 4: {
			const step = 100;
			const center = ((totalCells - 1) * step) / 2;
			tl = gsap
				.timeline({ defaults: { ease: 'power1' }, scrollTrigger: { trigger: node, start: 'top bottom+=30%', end: 'top top+=10%', scrub: true } })
				.fromTo(inners, { xPercent: (i: number) => (i < half ? -50 * i - 50 : 50 * (i - half) + 50) }, { xPercent: 0 }, 0)
				.fromTo(inners, { scaleX: 1.5, scaleY: 0, transformOrigin: '50% 0%' }, { ease: 'power2.inOut', scaleX: 1, scaleY: 1 }, 0)
				.fromTo(boxes, { xPercent: (i: number) => i * step - center }, { xPercent: 0, stagger: { amount: 0.07, from: 'center' } }, 0);
			break;
		}

		case 5:
			tl = gsap
				.timeline({ defaults: { ease: 'power1' }, scrollTrigger: { trigger: node, start: 'top bottom', end: 'top top+=10%', scrub: true } })
				.fromTo(
					inners,
					{
						xPercent: (i: number) => (i < half ? -20 * i - 20 : 20 * (i - half) + 20),
						yPercent: (i: number) => (i % 2 === 0 ? -40 : 40)
					},
					{ xPercent: 0, yPercent: 0 },
					0
				);
			break;

		case 6:
			tl = gsap
				.timeline({ scrollTrigger: { trigger: node, start: 'top bottom', end: 'top top', scrub: true } })
				.fromTo(inners, { xPercent: (i: number) => (totalCells - i - 1) * -6 - 6 }, { ease: 'power1', xPercent: 0 }, 0)
				.fromTo(boxes, { yPercent: (i: number) => i * 20 }, { yPercent: 0 }, 0);
			break;
	}

	return {
		destroy() {
			window.removeEventListener('resize', updateLayout);
			tl?.kill();
		}
	};
};
