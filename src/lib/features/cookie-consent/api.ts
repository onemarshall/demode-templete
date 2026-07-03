import { browser } from '$app/environment'
import * as CookieConsent from 'vanilla-cookieconsent'
import { cookieConsentState, defaultConsentPreferences, type ConsentPreferences } from './store.svelte'

function getPreferences(): ConsentPreferences {
	if (!browser) return defaultConsentPreferences

	try {
		const preferences = CookieConsent.getUserPreferences()

		return {
			acceptType: preferences.acceptType,
			acceptedCategories: preferences.acceptedCategories,
			rejectedCategories: preferences.rejectedCategories,
			acceptedServices: preferences.acceptedServices,
			rejectedServices: preferences.rejectedServices,
		}
	} catch {
		return defaultConsentPreferences
	}
}

export function syncCookieConsentState(hasConsent = CookieConsent.validConsent()) {
	if (!browser) return
	cookieConsentState.setPreferences(getPreferences(), hasConsent)
	cookieConsentState.setReady(true)
}

export function showCookieConsent() {
	if (!browser) return
	CookieConsent.show(true)
}

export function hideCookieConsent() {
	if (!browser) return
	CookieConsent.hide()
}

export function openCookiePreferences() {
	if (!browser) return
	CookieConsent.showPreferences()
}

export function closeCookiePreferences() {
	if (!browser) return
	CookieConsent.hidePreferences()
}

export function hasCategoryConsent(category: string) {
	if (!browser) return false
	return cookieConsentState.preferences.acceptedCategories.includes(category)
}

export function hasServiceConsent(category: string, service: string) {
	if (!browser) return false
	const services = cookieConsentState.preferences.acceptedServices[category] ?? []
	return services.includes(service)
}
