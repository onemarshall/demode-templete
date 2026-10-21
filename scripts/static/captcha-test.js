// Captcha Widget Testing Utilities
// Add this to browser console on sign-in page

window.testCaptcha = {
	// Manually trigger captcha display
	triggerCaptcha: function () {
		const app = document.querySelector('[data-sveltekit]');
		if (app && app.__sveltekit) {
			// Access component state and trigger captcha
			console.log('Triggering captcha display...');
			// This would need to be adapted based on your component structure
		}
	},

	// Check captcha configuration
	checkConfig: function () {
		console.log('Captcha Configuration:', {
			PUBLIC_CAP_URL: import.meta.env?.PUBLIC_CAP_URL,
			PUBLIC_CAP_KEY: import.meta.env?.PUBLIC_CAP_KEY ? 'Set' : 'Not set',
			capWidgetLoaded: !!window.cap
		});
	},

	// Simulate captcha completion
	simulateCompletion: function (token = 'test-token-' + Date.now()) {
		console.log('Simulating captcha completion with token:', token);
		// Dispatch custom event like the real widget would
		const event = new CustomEvent('solve', {
			detail: { token },
			bubbles: true
		});
		document.querySelector('cap-widget')?.dispatchEvent(event);
	},

	// Test captcha service availability
	testService: async function () {
		try {
			const response = await fetch(`${import.meta.env?.PUBLIC_CAP_URL}/cap.js`);
			console.log('Captcha service status:', response.ok ? 'Available' : 'Unavailable');
		} catch (error) {
			console.error('Captcha service error:', error);
		}
	}
};

console.log('Captcha testing utilities loaded. Use window.testCaptcha.checkConfig() to start.');
