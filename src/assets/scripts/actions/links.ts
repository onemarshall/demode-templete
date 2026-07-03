import { gsap } from './gsap';
import type { Action } from 'svelte/action';

export interface FxLinksOptions {
	/** CSS selector for the main nav link items. Default: '.js-links' */
	linksSelector?: string;
	/** CSS selector for the bottom nav link items. Default: '.js-links-bottom' */
	bottomLinksSelector?: string;
}

/**
 * Animates nav links when the node (a menu button) is clicked.
 * Main links slide in from the right; bottom links rise up.
 *
 * Usage:
 *   <button use:links>Menu</button>
 *   <button use:links={{ linksSelector: '.nav-item', bottomLinksSelector: '.nav-footer-item' }}>Menu</button>
 */
export const links: Action<HTMLElement, FxLinksOptions | undefined> = (node, options = {}) => {
	const { linksSelector = '.js-links', bottomLinksSelector = '.js-links-bottom' } = options;

	function handleClick() {
		// Query at click time so elements added after mount are found
		const navLinks = gsap.utils.toArray<Element>(linksSelector);
		const navLinksBottom = gsap.utils.toArray<Element>(bottomLinksSelector);

		if (navLinks.length > 0) {
			gsap.set(navLinks, { autoAlpha: 0, x: 30 });
			gsap.to(navLinks, {
				autoAlpha: 1,
				x: 0,
				ease: 'back.inOut(2.5)',
				duration: 0.6,
				stagger: { each: 0.04 },
				onComplete: () => void gsap.set(navLinks, { clearProps: 'all' })
			});
		}
		if (navLinksBottom.length > 0) {
			gsap.set(navLinksBottom, { autoAlpha: 0, y: 10 });
			gsap.to(navLinksBottom, {
				autoAlpha: 1,
				y: 0,
				ease: 'back.inOut(0.5)',
				duration: 0.6,
				stagger: { each: 0.02 },
				onComplete: () => void gsap.set(navLinksBottom, { clearProps: 'all' })
			});
		}
	}

	node.addEventListener('click', handleClick);

	return {
		destroy() {
			node.removeEventListener('click', handleClick);
		}
	};
};
