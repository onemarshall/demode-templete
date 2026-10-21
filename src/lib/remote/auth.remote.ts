import { form, query, getRequestEvent } from '$app/server';
import { auth } from '#lib/auth/server/config.js';
import { z } from 'zod';
import { redirect } from '@sveltejs/kit';
import { setAuthCookies } from '#lib/auth/server/utils.js';

const nameRegex = /^[\p{L}\s'-]+$/u;

const nameSchema = z
  .string({ error: 'Full name is required' })
  .min(3, { error: 'Full name must be at least 3 characters' })
  .max(50, { error: 'Full name must be less than 50 characters' })
  .regex(nameRegex, { error: 'Name contains invalid characters' });

  const passwordSchema = z
  .string({ error: 'Password is required' })
  .min(8, { error: 'Password must be at least 8 characters' })
  .max(128, { error: 'Password must be less than 128 characters' });

  const authErrorResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
  code: z.string().optional()
});

// Simplified schemas for Remote Functions to avoid refinement issues
const loginRemoteSchema = z.object({
  email: z.email(),
  password: passwordSchema
});

const signupRemoteSchema = z
  .object({
    name: nameSchema,
    email: z.email(),
    password: passwordSchema,
    passwordConfirm: passwordSchema
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm']
  });

export const login = form(loginRemoteSchema, async (data) => {
  const { request, cookies } = getRequestEvent();
  const response = await auth.api.signInEmail({
    body: {
      email: data.email,
      password: data.password
    },
    headers: request.headers,
    asResponse: true
  });

  if (!response.ok) {
    let message = 'This password is invalid.';

    try {
      const raw = await response.clone().json();
      const parsed = authErrorResponseSchema.safeParse(raw);
      if (parsed.success) {
        const serverMessage = parsed.data.message || parsed.data.error;
        message =
          serverMessage && !/invalid email or password/i.test(serverMessage)
            ? serverMessage
            : message;
      }
    } catch {
      // Ignore response parsing failures and fall back to a generic message.
    }

    return {
      error: message
    };
  }

  setAuthCookies(cookies, response.headers);

  redirect(303, '/auth/dashboard');
});

export const signup = form(signupRemoteSchema, async (data) => {
  const { request, cookies } = getRequestEvent();
  const response = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name
    },
    headers: request.headers,
    asResponse: true
  });

  if (!response.ok) {
    let message = 'Failed to create your account. Please try again.';
    try {
      const raw = await response.clone().json();
      const parsed = authErrorResponseSchema.safeParse(raw);
      if (parsed.success) {
        message = parsed.data.message || parsed.data.error || message;
      }
    } catch {
      // Ignore parse failures, fall back to generic message
    }
    return { error: message };
  }

  setAuthCookies(cookies, response.headers);
  return { ok: true, email: data.email };
});

export const signout = form(async () => {
  const { request, cookies } = getRequestEvent();
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true
  });

  setAuthCookies(cookies, response.headers);

  redirect(303, '/auth/sign-in');
});

export const getSession = query(async () => {
  const { request } = getRequestEvent();
  return await auth.api.getSession({
    headers: request.headers
  });
});
