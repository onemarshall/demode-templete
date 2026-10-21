// src/routes/auth/reset-password/+page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { resetPasswordSchema } from '$lib/components/forms/schema';

export const load = async () => {
	return {
		form: await superValidate(zod4(resetPasswordSchema))
	};
};
