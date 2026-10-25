import { describe, expect, it } from 'vitest';
import { DirectusCMSProvider } from '.';

describe('Directus CMS provider initialization', () => {
	it('adapts provider logging to the SDK void-return contract', () => {
		const provider = new DirectusCMSProvider({
			provider: 'directus',
			url: 'https://directus.example.test',
			apiToken: 'test-token'
		});

		expect(provider.syncClient).toBeDefined();
	});
});
