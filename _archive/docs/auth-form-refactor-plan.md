# PR #7 Plan — Auth Form Library

_Status: proposal v2, awaiting approval before implementation._

## Goal

Build a small, opinionated auth-form component library under
`src/lib/components/forms/auth/` and migrate every auth page in the app
to use it. Each route file shrinks from ~300–500 lines to ~30–50 lines
that pass copy and config into a shared flow component.

Estimated impact:

- ~1,900 lines deleted across 8 pages
- One visual style for every auth page (card chrome, alerts, social row,
  footer links)
- One place to fix captcha, error scheduling, social login, or visual
  bugs — instead of 8

## Scope

| Page                                            | Lines | Approach                       |
| ----------------------------------------------- | ----- | ------------------------------ |
| `(sign-in)/sign-in/+page.svelte`                | 403   | use `AuthForm`                 |
| `(sign-up)/sign-up/+page.svelte`                | 463   | use `AuthForm`                 |
| `(sign-in)/sign-in-magic-link/+page.svelte`     | 337   | use `AuthMagicLinkForm`        |
| `(sign-up)/sign-up-magic-link/+page.svelte`     | 348   | use `AuthMagicLinkForm`        |
| `(sign-in)/sign-in-otp/+page.svelte`            | 477   | use `AuthOTPForm`              |
| `(sign-in)/sign-in-siwe/+page.svelte`           | 244   | use shared primitives only     |
| `(password)/forgot-password/+page.svelte`       | ?     | use `AuthPasswordRequestForm`  |
| `(password)/reset-password/+page.svelte`        | ?     | use `AuthPasswordSetForm`      |
| `(change)/change-password/+page.svelte`         | ?     | use `AuthPasswordSetForm`      |
| `(change)/set-password/+page.svelte`            | ?     | use `AuthPasswordSetForm`      |
| `(change)/change-email/+page.svelte`            | ?     | use `AuthChangeEmailForm`      |

Out of scope: profile pages (`profile`, `sessions`, `trusted-devices`,
`2fa`, `account-recovery`, `goodbye`) — they're dashboard surfaces, not
auth flows.

## Library shape

Location: `src/lib/components/forms/auth/`

### Flow components

Each owns its state, side effects, captcha, social buttons, alerts, and
template. Pages pass copy/config and that's it.

| Component                  | Pages it powers                                | Notes                              |
| -------------------------- | ---------------------------------------------- | ---------------------------------- |
| `AuthForm`                 | sign-in, sign-up                               | password + captcha + social + passkey |
| `AuthMagicLinkForm`        | sign-in-magic-link, sign-up-magic-link         | email-only + social                |
| `AuthOTPForm`              | sign-in-otp                                    | two-step: email then 6-digit code  |
| `AuthPasswordRequestForm`  | forgot-password                                | email-only, no social              |
| `AuthPasswordSetForm`      | reset-password, set-password, change-password  | new + confirm; optional "current"  |
| `AuthChangeEmailForm`      | change-email                                   | new email + optional current pass  |

`AuthForm` API sketch:

```ts
type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  copy?: Partial<{
    title: string;
    description: string;
    submitLabel: string;
    submitLoadingLabel: string;
    altLinkLabel: string;
    altLinkHref: string;
    altLinkText: string;
    successMessage: string;
  }>;
  redirectTo?: string;
  showPasskey?: boolean;
  showSocial?: boolean;
  showMagicLinkLink?: boolean;
};
```

`AuthOTPForm` is the only multi-step one. Internally it holds a
`$state<'email' | 'code'>('email')` and renders the email step
(reusing `AuthFormCard` + email input + captcha) then swaps to the OTP
input step. No external "step" state needed.

### Shared primitives

Smaller building blocks that flow components compose AND that the SIWE
page uses directly. These are not coupled to any specific auth flow.

| Primitive             | What it owns                                                                |
| --------------------- | --------------------------------------------------------------------------- |
| `AuthFormCard`        | Card.Root + Card.Header + title + description + slot for body              |
| `AuthFormSocialRow`   | Google + GitHub buttons, social-login state, separator above/below          |
| `AuthFormFooterLink`  | "Don't have an account? Sign up" style footer text + link                  |
| `AuthFormAlert`       | Already exists; will be the single alert component used everywhere          |
| `AuthCaptchaPanel`    | CapWidgetAdapter wrapper + endpoint computation + error display             |
| `captcha-endpoint.ts` | `computeCapEndpoint()` helper (currently duplicated in every page)          |

## Migration plan (commit-by-commit)

Each commit is independently revertable and leaves the app working.

1. **Foundation** — Add primitives (`AuthFormCard`, `AuthFormSocialRow`,
   `AuthFormFooterLink`, `AuthCaptchaPanel`, `captcha-endpoint.ts`).
   No page changes yet. Verify primitives compile.
2. **AuthForm + sign-in migration** — Build `AuthForm.svelte` from
   sign-in. Migrate sign-in. Manually verify.
3. **sign-up migration** — Migrate sign-up to `AuthForm mode="sign-up"`.
   Verify.
4. **AuthMagicLinkForm + magic-link pair** — Build component and
   migrate both magic-link pages.
5. **AuthOTPForm + OTP migration** — Build the two-step OTP component
   and migrate the OTP page.
6. **AuthPasswordRequestForm + forgot-password** — Smallest password
   form first.
7. **AuthPasswordSetForm + reset/set/change-password** — One component
   powers three pages. The "requires current password" toggle keeps
   change-password honest.
8. **AuthChangeEmailForm + change-email** — Last password-adjacent page.
9. **SIWE primitives migration** — Refactor sign-in-siwe to use
   `AuthFormCard` + `AuthFormAlert` + `AuthFormFooterLink`. No new
   flow component. Consistent visual chrome across the app.

Total: 9 commits over the PR.

## Risks / edge cases I'll watch for

- **`AuthFormAlert` vs raw `<Alert>` inconsistency** — credential pair
  uses raw `<Alert.Root>`, magic-link/OTP use `<AuthFormAlert>`. Pick
  `AuthFormAlert` as canonical; replace raw `<Alert>` usages.
- **`createSpaForm`** is used by OTP and possibly others. Flow components
  should not depend on it — direct runed state is simpler and is what
  sign-in already uses.
- **`?verified=true` query handling** is sign-in-specific. Pass an
  optional `onMount?: (search: URLSearchParams) => string | null`
  callback into `AuthForm`, or just keep the query parsing in the route.
- **`?token=` for reset-password** — the route reads the token from URL;
  pass it to `AuthPasswordSetForm` as a `resetToken?: string` prop. Same
  for `?email=` if present.
- **Sign-up extra fields** (`name`, `passwordConfirm`) — guarded by
  `{#if mode === 'sign-up'}` blocks in the template; not a separate
  component.
- **Session requirement** — change-password / change-email / set-password
  require an active session. The form should accept an optional
  `onUnauthenticated?: () => void` callback so the route can redirect.
- **OTP verify sub-page** (`sign-in-otp/verify/+page.svelte`) is a
  separate route that handles the link click. It's not part of the form;
  it just consumes the URL. Leave alone or migrate to primitives in a
  follow-up.

## Estimated diff

- New files: 6 flow components + 5 primitives + 1 util = ~12 files,
  ~1,800 lines added (mostly carved from existing pages).
- Modified: 11 page files, each shrinking ~300–500 → ~30–50 lines.
- Net change: **~1,900 lines deleted**.

## Definition of done

- All 8 form pages migrated; each manually smoke-tested.
- SIWE page migrated to primitives, visually consistent with the rest.
- `bun run check` clean for all new files (pre-existing errors elsewhere
  not blocking).
- No regression in the existing captcha or social-login flows.
- Single source of truth for: card chrome, alert UX, social buttons,
  footer-link styling, captcha wiring.
