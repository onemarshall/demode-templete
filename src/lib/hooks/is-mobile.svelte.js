import { SvelteSet } from 'svelte/reactivity'

/**
 * Mobile detection utility class
 * Provides reactive mobile device detection based on viewport width
 */
export class IsMobile {
	/** @type {boolean} */
	#current = false
	/** @type {number} */
	#breakpoint
	/** @type {SvelteSet<() => void>} */
	#listeners = new SvelteSet()

	/**
	 * Create a new IsMobile instance
	 * @param {number} breakpoint - Maximum width to consider as mobile (default: 768px)
	 */
	constructor(breakpoint = 768) {
		this.#breakpoint = breakpoint

		// Only run on client side
		if (typeof window !== 'undefined') {
			this.#update()
			this.#setupResizeListener()
		}
	}

	/**
	 * Current mobile status
	 */
	get current() {
		return this.#current
	}

	/**
	 * Breakpoint used for mobile detection
	 */
	get breakpoint() {
		return this.#breakpoint
	}

	/**
	 * Set new breakpoint and update status
	 */
	set breakpoint(value) {
		this.#breakpoint = value
		this.#update()
	}

	/**
	 * Update mobile status based on current viewport
	 */
	#update() {
		if (typeof window === 'undefined') return

		const wasMobile = this.#current
		this.#current = window.innerWidth < this.#breakpoint

		// Notify listeners if status changed
		if (wasMobile !== this.#current) {
			this.#notifyListeners()
		}
	}

	/**
	 * Setup resize event listener
	 */
	#setupResizeListener() {
		if (typeof window === 'undefined') return

		/** @type {number} */
		let resizeTimer
		const handleResize = () => {
			clearTimeout(resizeTimer)
			resizeTimer = window.setTimeout(() => {
				this.#update()
			}, 100) // Debounce resize events
		}

		window.addEventListener('resize', handleResize, { passive: true })
	}

	/**
	 * Add listener for mobile status changes
	 * @param {() => void} callback - Function to call when mobile status changes
	 * @returns {() => void} Cleanup function to remove listener
	 */
	onChange(callback) {
		this.#listeners.add(callback)

		return () => {
			this.#listeners.delete(callback)
		}
	}

	/**
	 * Notify all listeners of status change
	 */
	#notifyListeners() {
		this.#listeners.forEach((callback) => {
			try {
				callback()
			} catch (error) {
				console.error('Error in IsMobile listener:', error)
			}
		})
	}

	/**
	 * Check if currently mobile (alias for current)
	 */
	isMobile() {
		return this.#current
	}

	/**
	 * Check if currently desktop
	 */
	isDesktop() {
		return !this.#current
	}

	/**
	 * Cleanup method to remove event listeners
	 */
	destroy() {
		this.#listeners.clear()
		// Note: We don't remove the resize listener as it might affect other instances
		// In a production app, you might want to use a shared resize listener
	}
}

/**
 * Convenience function to create a singleton instance
 */
/** @type {IsMobile | null} */
let singletonInstance = null

/**
 * @param {number} [breakpoint]
 * @returns {IsMobile}
 */
export function getIsMobile(breakpoint) {
	if (!singletonInstance) {
		singletonInstance = new IsMobile(breakpoint)
	}
	return singletonInstance
}

/**
 * Reactive mobile detection using Svelte stores (if you want to use it with Svelte)
 * @param {number} [breakpoint]
 * @returns {{subscribe: Function, current: boolean, isMobile: boolean, isDesktop: boolean}}
 */
export function createMobileStore(breakpoint = 768) {
	const isMobile = new IsMobile(breakpoint)

	return {
		subscribe: (/** @type {(value: boolean) => void} */ callback) => {
			callback(isMobile.current)
			return isMobile.onChange(() => callback(isMobile.current))
		},
		get current() {
			return isMobile.current
		},
		get isMobile() {
			return isMobile.isMobile()
		},
		get isDesktop() {
			return isMobile.isDesktop()
		},
	}
}
