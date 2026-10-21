import type { IncidentCounts, RecommendedActionItem } from './triage';

export type StatusLevel = 'safe' | 'watch' | 'act_now';

export interface SecurityStatus {
	level: StatusLevel;
	headline: string;
	detail: string;
}

interface DeriveStatusInput {
	counts: IncidentCounts;
	actions: RecommendedActionItem[];
}

export function deriveSecurityStatus({ counts, actions }: DeriveStatusInput): SecurityStatus {
	const openActions = actions.filter((a) => a.status !== 'acknowledged' && a.status !== 'resolved');
	const criticalOpen = openActions.filter((a) => a.severity === 'critical').length;
	const highOpen = openActions.filter((a) => a.severity === 'high').length;
	const mediumOpen = openActions.filter((a) => a.severity === 'medium').length;
	const totalOpen = openActions.length;

	if (criticalOpen > 0) {
		return {
			level: 'act_now',
			headline: pluralise(criticalOpen, 'critical issue', 'critical issues') + ' need your attention now.',
			detail: buildDetail(openActions)
		};
	}

	if (highOpen + mediumOpen > 0) {
		return {
			level: 'watch',
			headline: `You're mostly safe. ${pluralise(totalOpen, 'thing', 'things')} to keep an eye on.`,
			detail: buildDetail(openActions)
		};
	}

	if (counts.newLast15m > 0) {
		return {
			level: 'safe',
			headline: "You're safe.",
			detail: `${counts.newLast15m} new low-severity ${counts.newLast15m === 1 ? 'signal' : 'signals'} in the last 15 minutes. Nothing requires action.`
		};
	}

	return {
		level: 'safe',
		headline: "You're safe.",
		detail: 'No active threats. Nothing requires your attention right now.'
	};
}

function pluralise(n: number, singular: string, plural: string): string {
	return `${n} ${n === 1 ? singular : plural}`;
}

function buildDetail(actions: RecommendedActionItem[]): string {
	if (actions.length === 0) return 'No open recommended actions.';
	const top = actions.slice(0, 2).map((a) => a.title.replace(/\.$/, ''));
	const remainder = actions.length - top.length;
	const tail = remainder > 0 ? ` · +${remainder} more` : '';
	return top.join(' · ') + tail + '.';
}
