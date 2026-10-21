// Development captcha override utility
// Add to browser console to bypass security plugin captcha detection

window.overrideCaptcha = {
	// Force captcha requirement on next sign-in attempt
	forceNextSignIn() {
		console.log('Forcing captcha on next sign-in...');

		// Override the fraud detection to always trigger captcha
		if (window.fraudDetection) {
			window.fraudDetection.shouldTriggerCaptcha = () => true;
			console.log('Override applied to fraudDetection');
		}

		// Mock CAPTCHA_REQUIRED error response
		const originalSignIn = window.authClient?.signIn?.email;
		if (originalSignIn) {
			window.authClient.signIn.email = function (credentials, options) {
				// Simulate captcha requirement
				options.onError?.({
					error: {
						code: 'CAPTCHA_REQUIRED',
						message: 'Captcha required for testing'
					}
				});
			};
			console.log('Override applied to authClient');
		}
	},

	// Remove all overrides
	clearOverrides() {
		console.log('Clearing captcha overrides...');
		location.reload();
	}
};

console.log('Captcha override utilities loaded. Use:');
console.log('window.overrideCaptcha.forceNextSignIn() - Force captcha on next sign-in');
console.log('window.overrideCaptcha.clearOverrides() - Remove overrides');
