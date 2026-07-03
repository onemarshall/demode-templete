import { ScrollSmoother, ScrollTrigger } from './gsap';
import type { Action } from 'svelte/action'

interface FeatureStickyOptions {
	onActiveChange?: (index: number) => void
}

export const featureSticky: Action<HTMLElement, FeatureStickyOptions | undefined> = (
	node,
	options = {}
) => {
	const { onActiveChange } = options

	const contentList = node.querySelector<HTMLElement>('[data-sticky-feature-content-list]')
	const mediaColumn = node.querySelector<HTMLElement>('[data-sticky-feature-media]')
	const itemElements = Array.from(node.querySelectorAll<HTMLElement>('[data-sticky-feature-item]'))
	const titleElements = Array.from(node.querySelectorAll<HTMLElement>('[data-sticky-feature-title]'))

	if (itemElements.length === 0) {
		return { destroy() {} }
	}

	const setActive = (index: number) => {
		onActiveChange?.(index)
	}

	const itemTriggers = itemElements.map((itemElement, index) =>
		ScrollTrigger.create({
			trigger: itemElement,
			start: 'top center',
			end: 'bottom center',
			onEnter: () => {
				setActive(index)
			},
			onEnterBack: () => {
				setActive(index)
			},
		})
	)

	const pinTrigger =
		contentList && mediaColumn
			? ScrollTrigger.create({
					trigger: contentList,
					start: 'top top',
					end: 'bottom bottom',
					pin: mediaColumn,
					pinSpacing: false,
				})
			: null

	const clickHandlers = titleElements.map((titleElement, index) => {
		const handleClick = () => {
			if (!mediaColumn || mediaColumn.offsetWidth < 1) return

			const itemElement = itemElements[index]
			if (!itemElement) return

			const smoother = ScrollSmoother.get()
			if (smoother) {
				smoother.scrollTo(itemElement, true, 'center center')
				return
			}

			itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}

		titleElement.addEventListener('click', handleClick)
		return { titleElement, handleClick }
	})

	setActive(0)
	ScrollTrigger.refresh()

	return {
		destroy() {
			itemTriggers.forEach((trigger) => trigger.kill())
			pinTrigger?.kill()
			clickHandlers.forEach(({ titleElement, handleClick }) => {
				titleElement.removeEventListener('click', handleClick)
			})
		},
	}
}
