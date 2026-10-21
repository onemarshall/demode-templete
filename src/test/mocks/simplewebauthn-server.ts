export const helpers = {
	getCertificateInfo: () => ({}),
};

export const generateRegistrationOptions = () => ({
	challenge: 'bW9jay1jaGFsbGVuZ2UtcmVnaXN0cmF0aW9u',
	rp: { name: 'test-app', id: 'localhost' },
	user: { id: 'bW9jay11c2VyLWlk', name: 'test', displayName: 'Test User' },
	pubKeyCredParams: [
		{ alg: -7, type: 'public-key' },
		{ alg: -257, type: 'public-key' },
	],
	timeout: 60000,
	attestation: 'none',
	excludeCredentials: [],
	authenticatorSelection: {
		residentKey: 'preferred',
		userVerification: 'preferred',
	},
	extensions: {},
});

export const generateAuthenticationOptions = () => ({
	challenge: 'bW9jay1jaGFsbGVuZ2UtYXV0aGVudGljYXRpb24',
	rpId: 'localhost',
	allowCredentials: [],
	userVerification: 'preferred',
	timeout: 60000,
	extensions: {},
});

export const verifyRegistrationResponse = () => ({
	verified: true,
	registrationInfo: {
		aaguid: '00000000-0000-0000-0000-000000000000',
		credentialDeviceType: 'singleDevice',
		credentialBackedUp: false,
		credential: {
			id: 'bW9jay1jcmVkZW50aWFsLWlk',
			publicKey: new Uint8Array([
				0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20,
				0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,
				0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13,
				0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d,
				0x1e, 0x1f, 0x22, 0x58, 0x20, 0x20, 0x21, 0x22, 0x23, 0x24,
				0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e,
				0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38,
				0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f,
			]),
			counter: 0,
			transports: ['internal'],
		},
	},
});

export const verifyAuthenticationResponse = () => ({
	verified: true,
	authenticationInfo: {
		newCounter: 1,
		credentialID: 'bW9jay1jcmVkZW50aWFsLWlk',
		userVerified: true,
		credentialDeviceType: 'singleDevice',
		credentialBackedUp: false,
		origin: 'http://localhost:3000',
		rpID: 'localhost',
	},
});

export default {
	helpers,
	generateRegistrationOptions,
	generateAuthenticationOptions,
	verifyRegistrationResponse,
	verifyAuthenticationResponse,
};
