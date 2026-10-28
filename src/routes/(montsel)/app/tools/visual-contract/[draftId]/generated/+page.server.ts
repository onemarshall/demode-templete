import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft, loadGeneratedVersion } from '#lib/modules/visual-contract/server/repository.js';
import { sendContractToDesigner } from '#lib/modules/visual-contract/server/delivery.js';

const sendSchema = z.object({
	recipientEmail: z.email(),
	recipientName: z.string().trim().max(120).optional(),
	introLine: z.string().trim().max(300).optional(),
	sendCopy: z.boolean()
});

export const load: PageServerLoad = async (event) => {
	const actor = await brandActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This Visual Contract is not available.');

	const version = await loadGeneratedVersion(actor, draft.id);
	if (!version) error(404, 'This contract has not been generated yet.');

	const user = event.locals.auth?.user;
	return {
		publicId: version.publicId,
		publicUrl: `${event.url.origin}/contract/${version.publicId}`,
		saveUrl: null,
		content: version.rendered,
		context: version.projectContext,
		confirmedAt: version.confirmedAt,
		// Already owned by a brand: nothing to claim.
		claim: null,
		senderName: user?.name?.trim() || user?.email?.split('@')[0] || 'The client'
	};
};

export const actions: Actions = {
	send: async (event) => {
		const actor = await brandActor(event);
		const draft = await loadDraft(actor, event.params.draftId);
		if (!draft) return fail(404, { message: 'This Visual Contract is not available.' });

		const version = await loadGeneratedVersion(actor, draft.id);
		if (!version) return fail(404, { message: 'This contract has not been generated yet.' });

		const form = await event.request.formData();
		const parsed = sendSchema.safeParse({
			recipientEmail: String(form.get('recipientEmail') ?? '').trim(),
			recipientName: String(form.get('recipientName') ?? '').trim() || undefined,
			introLine: String(form.get('introLine') ?? '').trim() || undefined,
			sendCopy: form.get('sendCopy') === '1'
		});
		if (!parsed.success) {
			return fail(400, { message: 'Enter a valid email address for your designer.' });
		}

		const user = event.locals.auth?.user;
		const result = await sendContractToDesigner({
			version,
			senderName: user?.name?.trim() || user?.email?.split('@')[0] || 'The client',
			senderEmail: user?.email ?? '',
			recipientEmail: parsed.data.recipientEmail,
			recipientName: parsed.data.recipientName,
			introLine: parsed.data.introLine,
			sendCopyToSelf: parsed.data.sendCopy,
			contractUrl: `${event.url.origin}/contract/${version.publicId}`
		});

		if (!result.ok) return fail(502, { message: result.message });
		return { sentTo: result.sentTo, copiedToSelf: result.copiedToSelf };
	}
};
