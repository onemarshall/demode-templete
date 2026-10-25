/**
 * Forms Components Index
 *
 * Barrel export for all form components organized by domain.
 */

// Auth-specific forms
export { default as PasskeyButton } from '../../features/passkey/components/AuthPasskeyButton.svelte';
export { default as SocialButton } from './auth/AuthSocialButton.svelte';

// Shared form components
export { default as MockCaptchaWidget } from './shared/MockCaptchaWidget.svelte';
export { default as CapWidgetAdapter } from './shared/CapWidgetAdapter.svelte';

// Re-export from subdirectories
export * from './auth';
export * from './shared';
