import { ScrollSmoother } from './gsap';
import type { Action } from 'svelte/action'

interface SmoothScrollOptions {
	smooth?: number
	effects?: boolean
	wrapper?: string
	content?: string
}

export const smoothScroll: Action<HTMLElement, SmoothScrollOptions | undefined> = (
	node,
	options = {}
) => {
	const {
		smooth = 1.5,
		effects = true,
		wrapper = '#smooth-wrapper',
		content = '#smooth-content'
	} = options

	// Create ScrollSmoother with dynamic targets
	const smoother = ScrollSmoother.create({
		wrapper,
		content,
		smooth,
		effects
	})

	if (import.meta.env.DEV) {
		console.log('✅ Smooth scrolling action initialized')
	}

	return {
		destroy() {
			smoother.kill()
			if (import.meta.env.DEV) {
				console.log('🔚 Smooth scrolling action destroyed')
			}
		}
	}
}
