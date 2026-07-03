import { gsap, ScrollTrigger } from './gsap'
import type { Action } from 'svelte/action'

interface NumberCounterOptions {
	/** Target number to animate to. Required. */
	value: number
	/** Starting number. Default: 0 */
	from?: number
	/** Animation duration in seconds. Default: 2 */
	duration?: number
	/** Delay before animation starts in seconds. Default: 0 */
	delay?: number
	/** GSAP ease. Default: 'power2.out' */
	ease?: string
	/** Text before the number. Default: '' */
	prefix?: string
	/** Text after the number. Default: '' */
	suffix?: string
	/** Decimal places. Default: 0 */
	decimals?: number
	/** Thousands separator. Default: ',' */
	separator?: string
	/** ScrollTrigger start position. Default: 'top 80%' */
	start?: string
	/** Only fire once. Default: true */
	once?: boolean
}

function formatNumber(num: number, decimals: number, separator: string): string {
	const fixed = num.toFixed(decimals)
	const parts = fixed.split('.')
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator)
	return parts.join('.')
}

export const numberCounter: Action<HTMLElement, NumberCounterOptions> = (node, options) => {
	const {
		value,
		from = 0,
		duration = 2,
		delay = 0,
		ease = 'power2.out',
		prefix = '',
		suffix = '',
		decimals = 0,
		separator = ',',
		start = 'top 80%',
		once = true,
	} = options!

	node.textContent = prefix + formatNumber(from, decimals, separator) + suffix

	const trigger = ScrollTrigger.create({
		trigger: node,
		start,
		once,
		onEnter: () =>
			gsap.to({ v: from }, {
				v: value,
				duration,
				delay,
				ease,
				onUpdate() {
					const current = (this.targets()[0] as { v: number }).v
					node.textContent = prefix + formatNumber(current, decimals, separator) + suffix
				},
			}),
	})

	return {
		destroy() {
			trigger.kill()
		},
	}
}
