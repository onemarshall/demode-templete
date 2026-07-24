import { describe, it, expect, beforeEach } from 'vitest';
import {
	cookieConsentState,
	defaultConsentPreferences,
	isAnalyticsAllowed,
	isAdsAllowed,
} from './store.svelte';

describe('cookieConsentState', () => {
	beforeEach(() => {
		cookieConsentState.reset();
	});

	it('starts with the default empty consent state', () => {
		expect(cookieConsentState.ready).toBe(false);
		expect(cookieConsentState.hasConsent).toBe(false);
		expect(cookieConsentState.preferences).toEqual(defaultConsentPreferences);
	});

	it('marks the store as ready', () => {
		cookieConsentState.setReady(true);
		expect(cookieConsentState.ready).toBe(true);
	});

	it('records an all-consent preference', () => {
		cookieConsentState.setPreferences(
			{
				acceptType: 'all',
				acceptedCategories: ['necessary', 'analytics', 'ads'],
			},
			true,
		);

		expect(cookieConsentState.hasConsent).toBe(true);
		expect(cookieConsentState.preferences.acceptType).toBe('all');
		expect(isAnalyticsAllowed()).toBe(true);
		expect(isAdsAllowed()).toBe(true);
	});

	it('rejects analytics and ads when only necessary is accepted', () => {
		cookieConsentState.setPreferences(
			{
				acceptType: 'necessary',
				acceptedCategories: ['necessary'],
			},
			true,
		);

		expect(isAnalyticsAllowed()).toBe(false);
		expect(isAdsAllowed()).toBe(false);
	});

	it('resets back to the default state', () => {
		cookieConsentState.setReady(true);
		cookieConsentState.setPreferences({ acceptType: 'all', acceptedCategories: ['analytics'] }, true);
		cookieConsentState.reset();

		expect(cookieConsentState.ready).toBe(false);
		expect(cookieConsentState.hasConsent).toBe(false);
		expect(cookieConsentState.preferences).toEqual(defaultConsentPreferences);
	});
});
