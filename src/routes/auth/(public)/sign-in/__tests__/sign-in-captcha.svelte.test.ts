// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';

import CapWidgetAdapterStub from '../../../../../test/mocks/CapWidgetAdapter.svelte';

vi.mock('#lib/components/forms/shared/CapWidgetAdapter.svelte', () => ({
	default: CapWidgetAdapterStub
}));

vi.mock('#lib/auth/shared/env/index.js', () => ({
	publicEnv: {
		PUBLIC_CAP_ENDPOINT: '',
		PUBLIC_CAP_KEY: '',
		PUBLIC_ENV_MODE: 'test'
	}
}));

import AuthCaptchaPanel from '#lib/components/forms/auth/AuthCaptchaPanel.svelte';
import { publicEnv } from '#lib/auth/shared/env/index.js';

describe('AuthCaptchaPanel - Captcha widget', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		publicEnv.PUBLIC_CAP_ENDPOINT = '';
		publicEnv.PUBLIC_CAP_KEY = '';
	});

	it('shows configuration error when captcha endpoint is missing', () => {
		render(AuthCaptchaPanel, { props: { onSolve: vi.fn() } });

		expect(screen.getByText('Captcha endpoint is not configured.')).toBeInTheDocument();
	});

	it('renders captcha widget when endpoint is available', async () => {
		// The widget endpoint is composed from the cap server base URL and the
		// site key: {endpoint}/{siteKey}/
		publicEnv.PUBLIC_CAP_ENDPOINT = 'https://captcha.test';
		publicEnv.PUBLIC_CAP_KEY = 'abc';

		render(AuthCaptchaPanel, { props: { onSolve: vi.fn() } });

		const widget = await screen.findByTestId('cap-widget');
		expect(widget).toHaveAttribute('data-endpoint', 'https://captcha.test/abc/');
	});
});
