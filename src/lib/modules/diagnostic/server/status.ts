/**
 * One status vocabulary.
 *
 * The engine has run states; the intake has execution states; the engagement
 * has commercial and delivery states. This module is the only place they are
 * translated, so a screen never invents a fourth name for the same thing.
 */

import type { EngagementStatus } from './engagement.js';

export type StatusTone =
  | 'neutral'
  | 'progress'
  | 'attention'
  | 'success'
  | 'danger';

export interface DeliveryStatus {
  engagement: EngagementStatus;
  label: string;
  tone: StatusTone;
  message: string;
}

const fallback = (status: string): DeliveryStatus => ({
  engagement: 'in_delivery',
  label: status.replaceAll('_', ' '),
  tone: 'progress',
  message: 'The diagnostic is running.'
});

export function statusFromEngine(status: string): DeliveryStatus {
  switch (status) {
    case 'ready':
      return {
        engagement: 'in_delivery',
        label: 'Queued',
        tone: 'progress',
        message: 'Context assembly is queued.'
      };
    case 'context_ready':
      return {
        engagement: 'in_delivery',
        label: 'Evidence ready',
        tone: 'progress',
        message: 'The evidence set is assembled and the report is queued.'
      };
    case 'generating':
      return {
        engagement: 'in_delivery',
        label: 'Generating',
        tone: 'progress',
        message: 'The report is being generated.'
      };
    case 'automation_ready':
      // Intermediate: the engine still has to release the report. Mapping this
      // to `ready` made it indistinguishable from a published run and stopped
      // the poll loop before publication.
      return {
        engagement: 'in_delivery',
        label: 'Checks passed',
        tone: 'progress',
        message: 'The automated checks have passed; release is in progress.'
      };
    case 'review_required':
      return {
        engagement: 'ready',
        label: 'Ready for review',
        tone: 'attention',
        message: 'The report is ready for consultant review. It is not approved or published.'
      };
    case 'approved':
      // Intermediate: approved but not yet published.
      return {
        engagement: 'in_delivery',
        label: 'Approved',
        tone: 'progress',
        message: 'The report is approved and awaiting publication.'
      };
    case 'published':
      return {
        engagement: 'ready',
        label: 'Published',
        tone: 'success',
        message: 'The report is published and ready to import.'
      };
    case 'validation_failed':
      return {
        engagement: 'quality_hold',
        label: 'Quality hold',
        tone: 'attention',
        message: 'The report did not pass validation. Nothing has been delivered.'
      };
    case 'changes_requested':
      return {
        engagement: 'failed',
        label: 'Changes requested',
        tone: 'attention',
        message: 'The report was returned for changes. A corrected run is required.'
      };
    case 'failed':
      return {
        engagement: 'failed',
        label: 'Failed',
        tone: 'danger',
        message: 'The run failed. The purchase is retained; support can retry or refund.'
      };
    case 'cancelled':
      return {
        engagement: 'withdrawn',
        label: 'Cancelled',
        tone: 'neutral',
        message: 'The run was cancelled.'
      };
    default:
      return fallback(status);
  }
}

export function statusFromIntake(status: string): DeliveryStatus {
  switch (status) {
    case 'queued':
      return {
        engagement: 'in_delivery',
        label: 'Queued',
        tone: 'progress',
        message: 'The intake is queued. Capture has not started yet.'
      };
    case 'running':
      return {
        engagement: 'in_delivery',
        label: 'Running',
        tone: 'progress',
        message: 'The diagnostic is collecting evidence and preparing the report.'
      };
    case 'needs_analysis_review':
      return {
        engagement: 'in_delivery',
        label: 'Analysis review',
        tone: 'attention',
        message: 'The analysis is retained and awaiting the consultant’s exact-hash acceptance.'
      };
    case 'needs_decision_record':
      return {
        engagement: 'in_delivery',
        label: 'Decision record',
        tone: 'attention',
        message: 'The analysis is accepted. Generate and approve the decision record before the report.'
      };
    case 'held':
      return {
        engagement: 'quality_hold',
        label: 'Quality hold',
        tone: 'attention',
        message: 'The diagnostic cannot meet its required standard yet. Nothing has been delivered.'
      };
    case 'published':
      return {
        engagement: 'ready',
        label: 'Published',
        tone: 'success',
        message: 'The report is published and ready to import.'
      };
    case 'review_required':
      return statusFromEngine('review_required');
    default:
      return statusFromEngine(status);
  }
}

/**
 * Engine and intake states after which automated processing cannot progress
 * without an external actor. This set is the single authority: the poll loop
 * and every re-sync predicate read it, so terminality is defined once.
 *
 * `automation_ready` and `approved` are deliberately absent. Both describe work
 * the engine has yet to finish, and treating either as terminal stranded the
 * engagement before publication.
 *
 * An unrecognised status is not terminal. Unknown must mean "keep waiting",
 * never "stop".
 */
export const TERMINAL_INTAKE_STATUSES: ReadonlySet<string> = new Set([
  'published',
  'review_required',
  'needs_analysis_review',
  'needs_decision_record',
  'held',
  'validation_failed',
  'changes_requested',
  'failed',
  'cancelled'
]);

export function isTerminalIntake(status: string): boolean {
  return TERMINAL_INTAKE_STATUSES.has(status);
}

/**
 * Engagement states after which no automated work remains.
 *
 * `ready` is absent on purpose: it now means only "awaiting a human" or
 * "published, import pending", and a page visit should still be able to retry
 * an import from it.
 */
export const TERMINAL_ENGAGEMENT_STATUSES: ReadonlySet<EngagementStatus> = new Set([
  'delivered',
  'failed',
  'withdrawn',
  'quality_hold',
  'declined'
]);

export function isTerminalEngagement(status: EngagementStatus): boolean {
  return TERMINAL_ENGAGEMENT_STATUSES.has(status);
}

/** A status whose engagement state is known directly, not derived from the engine. */
export function statusForEngagement(
  status: EngagementStatus,
  message: string,
  tone: StatusTone = 'neutral'
): DeliveryStatus {
  return {
    engagement: status,
    label: ENGAGEMENT_LABELS[status] ?? status,
    tone,
    message
  };
}

/** A retryable import failure. Never `delivered`, never silently idle. */
export function retryingStatus(message: string): DeliveryStatus {
  return statusForEngagement('retrying', message, 'attention');
}

export const ENGAGEMENT_LABELS: Record<EngagementStatus, string> = {
  enquired: 'Enquiry',
  scoped: 'Scoped',
  quoted: 'Quoted',
  invoiced: 'Invoiced',
  paid: 'Paid',
  in_delivery: 'In delivery',
  delivered: 'Delivered',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  awaiting_input: 'Awaiting input',
  quality_hold: 'Quality hold',
  retrying: 'Retrying',
  failed: 'Failed',
  ready: 'Ready'
};

export function labelForEngagement(status: EngagementStatus): string {
  return ENGAGEMENT_LABELS[status] ?? status;
}
