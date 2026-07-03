import { browser } from '$app/env'

declare global {
	interface Window {
		dataLayer: unknown[]
		gtag?: (...args: unknown[]) => void
		[key: `ga-disable-${string}`]: boolean | undefined
	}
}

function getDisableFlag(analyticsId: string) {
	return `ga-disable-${analyticsId}` as const
}

function ensureGtag(analyticsId: string) {
	window.dataLayer = window.dataLayer || []
	window.gtag =
		window.gtag ||
		function gtag(...args: unknown[]) {
			window.dataLayer.push(args)
		}

	window.gtag('js', new Date())
	window.gtag('config', analyticsId, {
		anonymize_ip: true,
		send_page_view: true,
	})
}

function loadAnalyticsScript(analyticsId: string) {
	if (document.querySelector(`script[data-cookie-consent-ga="${analyticsId}"]`)) return

	const script = document.createElement('script')
	script.async = true
	script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`
	script.dataset.cookieConsentGa = analyticsId
	document.head.appendChild(script)
}

export function syncGoogleAnalyticsConsent(enabled: boolean, analyticsId?: string | null) {
	if (!browser || !analyticsId) return

	window[getDisableFlag(analyticsId)] = !enabled

	if (!enabled) {
		window.gtag?.('consent', 'update', {
			analytics_storage: 'denied',
		})
		return
	}

	loadAnalyticsScript(analyticsId)
	ensureGtag(analyticsId)
	window.gtag?.('consent', 'update', {
		analytics_storage: 'granted',
	})
}
