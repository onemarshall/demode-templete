import { superForm, type SuperForm } from 'sveltekit-superforms';
import { zod4Client } from 'sveltekit-superforms/adapters';

type CreateSpaFormArgs<TForm extends Record<string, unknown>> = {
	defaults: TForm;
	schema: SchemaInput;
	onSubmit: (formData: FormData, cancel: () => void) => Promise<void> | void;
	options?: Omit<Parameters<typeof superForm<TForm>>[1], 'validators' | 'onSubmit'>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaInput = any;

type SuperFormOpts<TForm extends Record<string, unknown>> = NonNullable<
	Parameters<typeof superForm<TForm>>[1]
>;

/**
 * Small helper to build SPA superforms with consistent defaults.
 * - Adds zod4Client validators
 * - Disables full invalidation
 * - Cancels native submit before calling your handler
 */
export function createSpaForm<TForm extends Record<string, unknown>>({
	defaults,
	schema,
	onSubmit,
	options
}: CreateSpaFormArgs<TForm>): SuperForm<TForm> {
	const validators = zod4Client(schema) as SuperFormOpts<TForm>['validators'];

	const formOptions: SuperFormOpts<TForm> = {
		SPA: true,
		invalidateAll: false,
		validationMethod: 'onblur',
		...(options ?? {}),
		validators,
		onSubmit: async ({ formData, cancel }: { formData: FormData; cancel: () => void }) => {
			cancel();
			await onSubmit(formData, cancel);
		}
	};

	return superForm<TForm>(
		{
			data: defaults,
			valid: false,
			errors: {},
			id: '',
			posted: false
		},
		formOptions
	);
}

type SubmitFlowArgs = {
	run: () => Promise<void>;
	setLoading: (value: boolean) => void;
	setError: (message: string) => void;
	setSuccess: (message: string) => void;
	successMessage?: string;
	redirect?: { goto: (href: string) => void; href: string; delayMs?: number };
};

/**
 * Standardized submit wrapper for auth forms.
 * Handles loading, error/success messages, and optional redirect.
 */
export async function handleSubmitFlow({
	run,
	setLoading,
	setError,
	setSuccess,
	successMessage,
	redirect
}: SubmitFlowArgs) {
	setLoading(true);
	setError('');
	setSuccess('');

	try {
		await run();
		if (successMessage) {
			setSuccess(successMessage);
		}

		if (redirect) {
			const delay = redirect.delayMs ?? 2000;
			setTimeout(() => redirect.goto(redirect.href), delay);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Request failed';
		setError(message);
	} finally {
		setLoading(false);
	}
}

/**
 * Helper to auto-clear messages after a delay. Call inside $effect in Svelte.
 */
export function scheduleMessageClear(opts: {
	hasError: boolean;
	hasSuccess: boolean;
	clear: () => void;
	delayMs?: number;
}) {
	if (!opts.hasError && !opts.hasSuccess) return;
	const timeout = setTimeout(opts.clear, opts.delayMs ?? 5000);
	return () => clearTimeout(timeout);
}
