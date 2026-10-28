import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolveUserImage: vi.fn() }));

vi.mock('#lib/modules/auth/server/session-serializer.js', () => ({
	resolveUserImage: mocks.resolveUserImage
}));

import { toShellUser } from '../shell-user.server.js';

const storedImage = 'ea5b96ac-9ce9-4a69-927d-0c08846c62ad';
const resolvedImage = 'https://auth-admin.iamstudios.cc/assets/ea5b96ac-9ce9-4a69-927d-0c08846c62ad';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('shell user', () => {
	it('resolves a stored CMS file id through the shared image resolver', () => {
		mocks.resolveUserImage.mockReturnValue(resolvedImage);

		const user = toShellUser({
			id: 'user-1',
			email: 'person@example.com',
			name: 'Robert White',
			image: storedImage
		});

		expect(mocks.resolveUserImage).toHaveBeenCalledWith(storedImage);
		expect(user.image).toBe(resolvedImage);
	});

	it('keeps the other session fields the shell relies on', () => {
		mocks.resolveUserImage.mockReturnValue(null);

		const user = toShellUser({
			id: 'user-1',
			email: 'person@example.com',
			name: 'Robert White',
			image: null,
			role: 'admin'
		});

		expect(user).toMatchObject({
			id: 'user-1',
			email: 'person@example.com',
			name: 'Robert White',
			role: 'admin',
			image: null
		});
	});

	it('never passes an unresolved value straight through to the avatar', () => {
		mocks.resolveUserImage.mockReturnValue(null);

		const user = toShellUser({ id: 'user-1', email: 'person@example.com', image: storedImage });

		expect(user.image).toBeNull();
		expect(user.image).not.toBe(storedImage);
	});
});
