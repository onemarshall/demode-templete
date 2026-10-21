// src/routes/auth/set-password/+page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setPasswordSchema } from '$lib/components/forms/schema';

export const load = async () => {
	return {
		form: await superValidate(zod4(setPasswordSchema))
	};
};
