// src/routes/auth/reset-password/+page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { resetPasswordSchema } from '#lib/modules/auth/components/forms/schema.js';

export const load = async () => {
	return {
		form: await superValidate(zod4(resetPasswordSchema))
	};
};
