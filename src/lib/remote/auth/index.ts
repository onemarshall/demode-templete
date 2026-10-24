/**
 * Auth module remotes — public barrel.
 *
 * Login/signup flows, account management, and avatar uploads.
 * Import from `#lib/remote/auth/index.js`.
 */

// Authentication flows
export { login, signup, signout, getSession } from './auth.remote';

// Account management
export { deleteAccount, unlinkWallet } from './account.remote';

// Avatar management
export { uploadAvatar, deleteAvatar } from './avatar.remote';
