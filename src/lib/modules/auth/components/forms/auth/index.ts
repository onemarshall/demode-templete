// Flow components
export { default as AuthForm } from './AuthForm.svelte';
export { default as AuthMagicLinkForm } from '../../../features/magic-link/components/AuthMagicLinkForm.svelte';
export { default as AuthOTPForm } from '../../../features/email-otp/components/AuthOTPForm.svelte';
export { default as AuthPasswordRequestForm } from './AuthPasswordRequestForm.svelte';
export { default as AuthPasswordSetForm } from './AuthPasswordSetForm.svelte';
export { default as AuthChangeEmailForm } from './AuthChangeEmailForm.svelte';

// Field-level primitives (input rows)
export { default as AuthEmailField } from './AuthEmailField.svelte';
export { default as AuthPasswordField } from './AuthPasswordField.svelte';

// Chrome primitives (used by flow components AND by SIWE directly)
export { default as AuthFormCard } from './AuthFormCard.svelte';
export { default as AuthFormAlert } from './AuthFormAlert.svelte';
export { default as AuthFormSocialRow } from './AuthFormSocialRow.svelte';
export { default as AuthFormFooterLink } from './AuthFormFooterLink.svelte';
export { default as AuthCaptchaPanel } from './AuthCaptchaPanel.svelte';
export { default as AuthPasskeyButton } from '../../../features/passkey/components/AuthPasskeyButton.svelte';
export { default as AuthSocialButton } from './AuthSocialButton.svelte';

// Utilities
export { computeCapEndpoint } from './captcha-endpoint';
