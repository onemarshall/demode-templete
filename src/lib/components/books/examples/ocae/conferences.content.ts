import { z } from 'zod';

const callToActionSchema = z.object({
	text: z.string(),
	link: z.string()
});

export const conferenceContentSchema = z.object({
	meta: z.object({
		title: z.string(),
		description: z.string()
	}),
	hero: z.object({
		header: z.string(),
		subheader: z.string(),
		callToAction: z.array(callToActionSchema)
	}),
	conferences: z.object({
		title: z.string(),
		introduction: z.string(),
		upcomingConference: z.object({
			name: z.string(),
			dates: z.string(),
			location: z.string(),
			theme: z.string(),
			callToAction: z.array(callToActionSchema)
		}),
		pastConferences: z.array(
			z.object({
				year: z.number(),
				name: z.string()
			})
		)
	}),
	callToAction: z.array(callToActionSchema)
});

const rawConferenceContent = {
	meta: {
		title: 'Conferences Example - Content Driven',
		description: 'Example page in src showing content module -> route -> component prop flow.'
	},
	hero: {
		header: 'Advancing Animal Ethics Through Academic Discourse',
		subheader: 'A src example mirroring src_ocae content-to-component patterns.',
		callToAction: [
			{ text: 'View Upcoming Conferences', link: '#upcoming' },
			{ text: 'View Past Conferences', link: '#past' }
		]
	},
	conferences: {
		title: 'Conferences at the Oxford Centre for Animal Ethics',
		introduction:
			'This content is defined in a standalone module, validated with Zod, loaded in +page.server.ts, and rendered by a presentational component.',
		upcomingConference: {
			name: 'Summer School 2026: Ethics of Captivity',
			dates: '3-6 August 2026',
			location: 'Oxford, UK',
			theme: 'Exploring the ethical dimensions and social implications of captivity.',
			callToAction: [
				{ text: 'Register Interest', link: '#register' },
				{ text: 'Submit Abstract', link: '#submit' }
			]
		},
		pastConferences: [
			{ year: 2025, name: 'Animals and Public Reason' },
			{ year: 2024, name: 'Humane Education in Practice' },
			{ year: 2023, name: 'Animals and Media' }
		]
	},
	callToAction: [{ text: 'View Full Conference Archive', link: '#archive' }]
};

export const conferenceContent = conferenceContentSchema.parse(rawConferenceContent);

export type ConferenceContent = z.infer<typeof conferenceContentSchema>;
