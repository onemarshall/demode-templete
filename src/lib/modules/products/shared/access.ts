/**
 * Access and work-state contracts (UI specification §4).
 *
 * Availability, ownership and progress are separate concepts. These functions
 * are pure: they turn already-authorised server data into display state, and
 * never decide access themselves.
 */

import type { ProductDescriptor, ProductFamily, ProductKey } from './registry.js';
import { availableProducts } from './registry.js';

export type AccessState = 'owned' | 'free' | 'not_owned' | 'restricted';
export type WorkState = 'not_started' | 'in_progress' | 'awaiting_decision' | 'completed';

export interface WorkItemView {
	id: string;
	productKey: ProductKey;
	title: string | null;
	state: WorkState;
	currentStepKey: string | null;
	currentStepLabel: string | null;
	stepsCompleted: number;
	stepsTotal: number | null;
	resumePath: string | null;
	startedAt: string | null;
	lastActivityAt: string | null;
	completedAt: string | null;
}

export type PrimaryActionKind = 'start' | 'continue' | 'view' | 'learn' | 'unavailable';

export interface PrimaryAction {
	kind: PrimaryActionKind;
	label: string;
	href: string | null;
}

export interface ProductAccess {
	product: ProductDescriptor;
	access: AccessState;
	/** The one work item the area should surface, if any. */
	work: WorkItemView | null;
	/** Every authorised work item for this product, most recently active first. */
	projects: WorkItemView[];
	action: PrimaryAction;
}

/** A brand's live entitlement to one product. */
export interface EntitlementRecord {
	productKey: ProductKey;
	status: 'active' | 'revoked' | 'expired';
	effectiveFrom: string;
	effectiveTo: string | null;
}

export const DOCUMENTS_PATH = '/app/documents';

/**
 * Resolve ownership from entitlement, never from lifecycle alone (§4).
 * Free tools are available to any authorised brand member; paid tools require
 * a live entitlement row; unbuilt products stay restricted even when owned.
 */
export function accessStateFor(
	product: ProductDescriptor,
	entitlement: EntitlementRecord | undefined,
): AccessState {
	if (product.lifecycle !== 'available') return 'restricted';
	if (product.pricingMode === 'free') return 'free';
	return entitlement?.status === 'active' ? 'owned' : 'not_owned';
}

/**
 * The work item a product area should surface: active work before completed
 * work, then the most recently active of those. Nothing is invented when the
 * brand has no work.
 */
export function selectCurrentWork(projects: readonly WorkItemView[]): WorkItemView | null {
	const rank = (work: WorkItemView) =>
		work.state === 'awaiting_decision'
			? 0
			: work.state === 'in_progress'
				? 1
				: work.state === 'not_started'
					? 2
					: 3;
	return (
		[...projects].sort(
			(a, b) =>
				rank(a) - rank(b) || (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''),
		)[0] ?? null
	);
}

/** The single primary action for a product area (§1 principle 3). */
export function primaryActionFor(
	product: ProductDescriptor,
	access: AccessState,
	work: WorkItemView | null,
): PrimaryAction {
	if (access === 'restricted') {
		return { kind: 'unavailable', label: 'Not yet available', href: null };
	}
	if (access === 'not_owned') {
		return { kind: 'learn', label: 'Learn more', href: product.learnMorePath };
	}
	if (!work || work.state === 'not_started') {
		return { kind: 'start', label: product.actionVerb, href: product.workflowPath };
	}
	if (work.state === 'completed') {
		return {
			kind: 'view',
			label: 'View results',
			href: `${DOCUMENTS_PATH}?product=${encodeURIComponent(product.key)}`
		};
	}
	return {
		kind: 'continue',
		label: work.state === 'awaiting_decision' ? 'Review decision' : 'Continue',
		href: work.resumePath ?? product.workflowPath
	};
}

export function buildProductAccess(
	product: ProductDescriptor,
	entitlement: EntitlementRecord | undefined,
	workItems: readonly WorkItemView[],
): ProductAccess {
	const access = accessStateFor(product, entitlement);
	const projects = [...workItems]
		.filter((work) => work.productKey === product.key)
		.sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''));
	const work = selectCurrentWork(projects);
	return { product, access, work, projects, action: primaryActionFor(product, access, work) };
}

export interface LibrarySections {
	owned: ProductAccess[];
	free: ProductAccess[];
	optional: ProductAccess[];
}

/**
 * Tools Library sections (§5.4). Owned paid tools first, then free tools, then
 * optional discovery for unowned paid tools. Planned and retired products are
 * absent everywhere: a registry entry is not a usable product.
 */
export function librarySections(access: readonly ProductAccess[]): LibrarySections {
	const tools = access.filter(
		(entry) => entry.product.family === 'tool' && entry.product.lifecycle === 'available',
	);
	const byActivity = (a: ProductAccess, b: ProductAccess) =>
		(b.work?.lastActivityAt ?? '').localeCompare(a.work?.lastActivityAt ?? '');
	return {
		owned: tools.filter((entry) => entry.access === 'owned').sort(byActivity),
		free: tools.filter((entry) => entry.access === 'free'),
		optional: tools.filter((entry) => entry.access === 'not_owned')
	};
}

/** Product-area summary for the dashboard, in registry order. */
export function familySummary(
	access: readonly ProductAccess[],
	family: ProductFamily,
): ProductAccess[] {
	return access.filter(
		(entry) => entry.product.family === family && entry.product.lifecycle === 'available',
	);
}

/**
 * The product area's headline: active owned work first, then any owned product,
 * then the first available product so a first-time user still sees a route in.
 */
export function primaryForFamily(
	access: readonly ProductAccess[],
	family: ProductFamily,
): ProductAccess | null {
	const entries = familySummary(access, family);
	const rank = (entry: ProductAccess) => {
		if (entry.access !== 'owned' && entry.access !== 'free') return 3;
		if (entry.work?.state === 'in_progress') return 0;
		if (entry.work?.state === 'awaiting_decision') return 0;
		if (entry.work?.state === 'completed') return 1;
		return 2;
	};
	return [...entries].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** Products that exist but are not owned — shown as optional discovery, never as actions. */
export function unownedProducts(access: readonly ProductAccess[]): ProductAccess[] {
	return access.filter(
		(entry) => entry.access === 'not_owned' && entry.product.lifecycle === 'available',
	);
}

/** Recent projects for a project-based tool, most recently active first (§5.4). */
export function recentProjects(
	access: readonly ProductAccess[],
	productKey: ProductKey,
	limit = 3,
): WorkItemView[] {
	const entry = access.find((item) => item.product.key === productKey);
	if (!entry?.product.supportsProjects) return [];
	return entry.projects.slice(0, limit);
}

export function productFamilyLabel(family: ProductFamily): string {
	return family === 'diagnostic' ? 'Diagnostic' : family === 'strategy' ? 'Strategy' : 'Tools';
}

const FAMILY_LANDING: Record<ProductFamily, string> = {
	diagnostic: '/app/diagnostic',
	strategy: '/app/strategy',
	tool: '/app/tools'
};

export interface AreaSummary {
	family: ProductFamily;
	label: string;
	landingPath: string;
	primary: ProductAccess | null;
	action: PrimaryAction;
	/** Truthful status text for the dashboard card. */
	status: string;
}

const WORK_STATE_LABEL: Record<WorkState, string> = {
	not_started: 'Not started',
	in_progress: 'In progress',
	awaiting_decision: 'Decision pending',
	completed: 'Complete'
};

export function workStateLabel(state: WorkState): string {
	return WORK_STATE_LABEL[state];
}

/**
 * Dashboard product-area summaries (§5.1). Each area gets one primary action;
 * an area the user does not own routes to its own landing page rather than
 * offering a purchase action it cannot fulfil.
 */
export function areaSummaries(access: readonly ProductAccess[]): AreaSummary[] {
	return (['diagnostic', 'strategy', 'tool'] as const).map((family) => {
		const primary = primaryForFamily(access, family);
		const label = productFamilyLabel(family);
		const landingPath = FAMILY_LANDING[family];
		const status = !primary
			? 'Not available'
			: primary.work
				? workStateLabel(primary.work.state)
				: primary.access === 'owned'
					? `${primary.product.name} purchased`
					: primary.access === 'free'
						? 'Available'
						: 'Not purchased';
		const action: PrimaryAction =
			!primary || primary.access === 'not_owned' || primary.access === 'restricted'
				? { kind: 'learn', label: `Explore ${label}`, href: landingPath }
				: primary.action;
		return { family, label, landingPath, primary, action, status };
	});
}

/** Work that is genuinely in flight, most recently active first (§5.1 "Your progress"). */
export function activeWork(access: readonly ProductAccess[], limit = 5): ProductAccess[] {
	return access
		.filter(
			(entry) =>
				entry.work !== null &&
				(entry.work.state === 'in_progress' || entry.work.state === 'awaiting_decision'),
		)
		.sort((a, b) => (b.work?.lastActivityAt ?? '').localeCompare(a.work?.lastActivityAt ?? ''))
		.slice(0, limit);
}

/** Registry keys that can appear in a brand's library. Used by the schema-consistency test. */
export function libraryProductKeys(): ProductKey[] {
	return availableProducts()
		.filter((product) => product.family === 'tool')
		.map((product) => product.key);
}
