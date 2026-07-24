import * as z from 'zod'
import { command } from '$app/server'
import { submitDirectusForm } from './directus-helpers'
import { createScopedLogger } from '$lib/utils/logger'

const log = createScopedLogger(['Forms', 'Generic'])

const genericFormSubmissionSchema = z.object({
	formId: z.string(),
	submissionData: z.record(z.string(), z.coerce.string()),
})

export const submitGenericForm = command(
	genericFormSubmissionSchema,
	async ({ formId, submissionData }) => {
		const title = await submitDirectusForm(formId, submissionData)
		log.info('Form submitted successfully:', title)
		return {
			success: true,
			message: 'Form submitted successfully!',
			title,
		}
	}
)
