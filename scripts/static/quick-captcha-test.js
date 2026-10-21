// Quick Captcha Test Script
// Run this in browser console on http://localhost:3000/test/captcha

console.log('=== Captcha Widget Quick Test ===');

// 1. Check environment configuration
console.log('1. Environment Check:');
console.log('PUBLIC_CAP_URL:', import.meta.env.PUBLIC_CAP_URL);
console.log('PUBLIC_CAP_KEY:', import.meta.env.PUBLIC_CAP_KEY ? 'Set' : 'Not set');

// 2. Test captcha service availability
async function testCaptchaService() {
	console.log('2. Testing captcha service...');
	try {
		const response = await fetch(import.meta.env.PUBLIC_CAP_URL + '/cap.js');
		console.log('Service status:', response.ok ? 'Available' : 'Unavailable');
		console.log('Response status:', response.status);
	} catch (error) {
		console.error('Service error:', error.message);
	}
}

// 3. Test widget endpoint
async function testWidgetEndpoint() {
	console.log('3. Testing widget endpoint...');
	try {
		const endpoint = `${import.meta.env.PUBLIC_CAP_URL}/${import.meta.env.PUBLIC_CAP_KEY}/`;
		const response = await fetch(endpoint, { method: 'HEAD' });
		console.log('Widget endpoint status:', response.ok ? 'Available' : 'Unavailable');
		console.log('Response status:', response.status);
	} catch (error) {
		console.error('Widget endpoint error:', error.message);
	}
}

// 4. Mock captcha completion
function mockCaptchaCompletion() {
	console.log('4. Mock captcha completion...');
	const mockToken = 'mock-captcha-token-' + Date.now();

	// Find the captcha widget and dispatch solve event
	const widget = document.querySelector('cap-widget');
	if (widget) {
		const event = new CustomEvent('solve', {
			detail: { token: mockToken },
			bubbles: true
		});
		widget.dispatchEvent(event);
		console.log('Mock captcha completed with token:', mockToken);
	} else {
		console.log('Captcha widget not found in DOM');
	}
}

// 5. Check widget loading
function checkWidgetLoading() {
	console.log('5. Checking widget loading...');
	console.log('window.cap available:', !!window.cap);
	console.log('cap-widget elements:', document.querySelectorAll('cap-widget').length);
}

// Run all tests
testCaptchaService();
testWidgetEndpoint();
checkWidgetLoading();

// Add mock test function to window for manual testing
window.mockCaptcha = mockCaptchaCompletion;
console.log('Mock captcha function available: window.mockCaptcha()');

console.log('=== Test Complete ===');
