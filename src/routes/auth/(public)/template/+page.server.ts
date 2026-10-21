// src/routes/auth/sign-in/+page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { signInSchema } from '#lib/components/forms/schema.js';

export const load = async () => {
	return {
		form: await superValidate(zod4(signInSchema))
	};
};
