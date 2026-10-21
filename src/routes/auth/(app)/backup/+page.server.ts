// src/routes/auth/delete-user/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { logger } from '#lib/auth/shared/logger.js';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { passwordSchema } from '#lib/components/forms/schema.js';

export const load = async ({ request, getClientAddress, depends }) => {
	logger.info('Delete user page load attempt', {
		ip: getClientAddress(),
		userAgent: request.headers.get('user-agent')?.slice(0, 50)
	});

	try {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session?.user) {
			logger.warn('Delete user access denied - no valid session', {
				ip: getClientAddress()
			});
			throw redirect(302, '/auth/sign-in');
		}

		// // Initialize the form with proper validation
		// const deleteForm = await superValidate(zod4(passwordSchema));

		logger.info('Delete user access granted', {
			userId: session.user.id,
			email: session.user.email
		});

		// Mark dependencies for invalidation
		depends('auth:session');
		depends('auth:user');

		logger.info('Access Data', {
			user: session.user,
			session: session.session
		});

		// NOTE 'return': Pass's data to the frontend
		return {
			// user: session.user,
			// session: session.session
		};
	} catch (error) {
		// Handle SvelteKit redirects properly - let them pass through
		if (!(error instanceof Error)) {
			throw error; // Let redirects pass through
		}
		// Only log actual Error instances
		logger.error('Delete user page load error', {
			error: error.message,
			ip: getClientAddress(),
			stack: error.stack
		});
		// NOTE 'throw': Redirects pass through
		throw redirect(302, '/auth/sign-in');
	}
};

export const actions = {
	default: async ({ request, getClientAddress }) => {
		logger.info('Delete user form submission attempt', {
			ip: getClientAddress()
		});

		try {
			// Validate the session first
			const session = await auth.api.getSession({
				headers: request.headers
			});

			if (!session?.user) {
				logger.warn('Delete user action denied - no valid session', {
					ip: getClientAddress()
				});
				throw redirect(302, '/auth/sign-in');
			}

			// Validate the form data
			const form = await superValidate(request, zod4(passwordSchema));

			if (!form.valid) {
				logger.warn('Delete user form validation failed', {
					userId: session.user.id,
					errors: form.errors
				});
				return fail(400, { form });
			}

			// Attempt to delete the user account
			try {
				await auth.api.deleteUser({
					body: {
						password: form.data.password as string
					},
					headers: request.headers
				});

				logger.info('User account deletion initiated', {
					userId: session.user.id,
					email: session.user.email
				});

				// Return success message
				return {
					form,
					message: 'Account deletion initiated. You will be redirected shortly.'
				};
			} catch (deleteError) {
				logger.error('Delete user API call failed', {
					userId: session.user.id,
					error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
				});

				// Return form with error
				return fail(400, {
					form,
					error:
						deleteError instanceof Error
							? deleteError.message
							: 'Failed to delete account. Please try again.'
				});
			}
		} catch (error) {
			// Handle SvelteKit redirects properly
			if (!(error instanceof Error)) {
				throw error;
			}

			logger.error('Delete user action error', {
				error: error.message,
				ip: getClientAddress(),
				stack: error.stack
			});

			return fail(500, {
				form: await superValidate(zod4(passwordSchema)),
				error: 'An unexpected error occurred. Please try again.'
			});
		}
	}
};
