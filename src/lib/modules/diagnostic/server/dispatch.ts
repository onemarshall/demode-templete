/**
 * Dispatch a diagnostic intake to Trigger.dev.
 *
 * The engagement id is the only argument. The task resolves the intake from the
 * durable engagement record, so a browser cannot supply a prompt, a path or a
 * model.
 */

export async function dispatchDiagnosticIntake(
	engagementId: string
): Promise<string | null> {
	try {
		const { tasks, idempotencyKeys } = await import('@trigger.dev/sdk');
		const key = await idempotencyKeys.create(
			`diagnostic-intake:${engagementId}`,
			{ scope: 'global' }
		);
		const handle = await tasks.trigger(
			'diagnostic-intake-v1',
			{ version: 1, engagementId },
			{ idempotencyKey: key }
		);
		return handle.id;
	} catch {
		// The engagement and its intake are already durable. A dispatch failure
		// must not lose them; the page reports that the run has not started.
		return null;
	}
}
