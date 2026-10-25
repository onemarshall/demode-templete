/**
 * Auth module remotes — public barrel.
 *
 * Login/signup flows, account management, and avatar uploads.
 * Import from `#lib/modules/auth/remote/index.js`.
 */

// Authentication flows
export { login, signup, signout, getSession } from './auth.remote.ts';

// Account management
export { deleteAccount, unlinkWallet } from './account.remote.ts';

// Avatar management
export { uploadAvatar, deleteAvatar } from '../features/avatar/remote/avatar.remote.ts';
