import type { CookieConsentConfig, CookieValue } from 'vanilla-cookieconsent'
import { syncCookieConsentState } from './api'

const legalUrls = {
	contact: '/support/contact-us',
	cookies: '/legal/cookies',
	privacy: '/legal/privacy',
}

export function createCookieConsentConfig(): CookieConsentConfig {
	return {
		categories: {
			necessary: {
				enabled: true,
				readOnly: true,
			},
		},
		onFirstConsent: ({ cookie }: { cookie: object }) => {
			syncCookieConsentState(true)
			if (import.meta.env.DEV) {
				console.log('onFirstConsent fired', cookie)
			}
		},
		onConsent: ({ cookie }: { cookie: object }) => {
			syncCookieConsentState(true)
			if (import.meta.env.DEV) {
				console.log('onConsent fired!', cookie)
			}
		},
		onChange: ({
			changedCategories,
			changedServices,
		}: {
			cookie: CookieValue
			changedCategories: string[]
			changedServices: { [key: string]: string[] }
		}) => {
			syncCookieConsentState(true)
			if (import.meta.env.DEV) {
				console.log('onChange fired!', changedCategories, changedServices)
			}
		},
		onModalReady: ({ modalName }: { modalName: string }) => {
			if (import.meta.env.DEV) {
				console.log('ready:', modalName)
			}
		},
		onModalShow: ({ modalName }: { modalName: string }) => {
			if (import.meta.env.DEV) {
				console.log('visible:', modalName)
			}
		},
		onModalHide: ({ modalName }: { modalName: string }) => {
			if (import.meta.env.DEV) {
				console.log('hidden:', modalName)
			}
		},
		guiOptions: {
			consentModal: {
				layout: 'box inline',
				position: 'bottom right',
				equalWeightButtons: true,
				flipButtons: false,
			},
			preferencesModal: {
				layout: 'box',
				equalWeightButtons: true,
				flipButtons: false,
			},
		},
		language: {
			default: 'en',
			translations: {
				en: {
					consentModal: {
						title: 'We use cookies',
						description:
							'We use essential cookies to keep this site working and remember your privacy choices.',
						acceptAllBtn: 'Accept',
						acceptNecessaryBtn: 'Only necessary',
						showPreferencesBtn: 'Manage preferences',
						footer: `
                  <a href="${legalUrls.cookies}" target="_blank" rel="noopener noreferrer">Cookie Policy</a>
                  <a href="${legalUrls.privacy}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          `,
					},
					preferencesModal: {
						title: 'Manage cookie preferences',
						acceptAllBtn: 'Accept all',
						acceptNecessaryBtn: 'Reject all',
						savePreferencesBtn: 'Save current selection',
						closeIconLabel: 'Close modal',
						serviceCounterLabel: 'Service|Services',
						sections: [
							{
								title: 'Your privacy choices',
								description:
									'Use these controls to review the essential cookies used on this site. You can return here at any time to revisit this panel.',
							},
							{
								title: 'Strictly necessary',
								description:
									'These cookies are required for core site functionality and cannot be disabled.',
								linkedCategory: 'necessary',
							},
							{
								title: 'More information',
								description: `Read our <a href="${legalUrls.cookies}">cookie policy</a>, review our <a href="${legalUrls.privacy}">privacy policy</a>, or <a href="${legalUrls.contact}">contact us</a> if you have questions.`,
							},
						],
					},
				},
			},
		},
	}
}
