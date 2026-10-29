import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import '../../../app.css';
import DashboardPage from '../app/+page.svelte';
import DiagnosticPage from '../app/diagnostic/+page.svelte';
import ToolsPage from '../app/tools/+page.svelte';
import DocumentsPage from '../app/documents/+page.svelte';
import {
	activeWork,
	areaSummaries,
	buildProductAccess,
	librarySections,
	type EntitlementRecord,
	type WorkItemView
} from '#lib/modules/products/shared/access.js';
import { requireProduct } from '#lib/modules/products/shared/registry.js';

const user = { id: 'user-a', name: 'Ada Lovelace', email: 'ada@example.com' };

const entitled = (key: EntitlementRecord['productKey']): EntitlementRecord => ({
	productKey: key,
	status: 'active',
	effectiveFrom: '2026-01-01T00:00:00.000Z',
	effectiveTo: null
});

const work = (overrides: Partial<WorkItemView> = {}): WorkItemView => ({
	id: 'work-1',
	productKey: 'diagnostic.signal',
	title: null,
	state: 'in_progress',
	currentStepKey: null,
	currentStepLabel: 'Market read',
	stepsCompleted: 1,
	stepsTotal: 4,
	resumePath: '/app/workflow/diagnostic.signal?step=2',
	startedAt: '2026-10-01T00:00:00.000Z',
	lastActivityAt: '2026-10-02T00:00:00.000Z',
	completedAt: null,
	...overrides
});

describe('dashboard', () => {
	it('shows a truthful first-time state with no fabricated progress', async () => {
		const products = [
			buildProductAccess(requireProduct('diagnostic.signal'), undefined, []),
			buildProductAccess(requireProduct('strategy'), undefined, []),
			buildProductAccess(requireProduct('tool.visual_contract'), undefined, [])
		];
		render(DashboardPage, {
			props: {
				data: {
					user,
					areas: areaSummaries(products),
					work: activeWork(products),
					documents: [],
					returning: false,
					visualContract: products[2]
				}
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Welcome to Montsel, Ada' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Try the Visual Contract (Free)')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Explore Diagnostic' }))
			.toHaveAttribute('href', '/app/diagnostic');
		await expect.element(page.getByText('Your progress')).not.toBeInTheDocument();
	});

	it('reports real progress and active work for a returning user', async () => {
		const products = [
			buildProductAccess(requireProduct('diagnostic.signal'), entitled('diagnostic.signal'), [work()]),
			buildProductAccess(requireProduct('strategy'), entitled('strategy'), [
				work({
					id: 'work-2',
					productKey: 'strategy',
					currentStepLabel: 'Viability Check',
					stepsCompleted: 4,
					stepsTotal: 12
				})
			])
		];
		render(DashboardPage, {
			props: {
				data: {
					user,
					areas: areaSummaries(products),
					work: activeWork(products),
					documents: [],
					returning: true,
					visualContract: null
				}
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Welcome back, Ada' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('1 of 4')).toBeInTheDocument();
		await expect.element(page.getByText('4 of 12')).toBeInTheDocument();
		await expect.element(page.getByText('Viability Check').first()).toBeInTheDocument();
	});
});

describe('diagnostic landing', () => {
	it('offers no action when the brand owns no diagnostic', async () => {
		render(DiagnosticPage, {
			props: {
				data: {
					fullOwned: false,
					owned: [],
					unowned: [buildProductAccess(requireProduct('diagnostic.signal'), undefined, [])],
					stages: [],
					report: null
				}
			} as never
		});

		await expect
			.element(page.getByRole('heading', { name: 'Choose a diagnostic to get started' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('link', { name: 'View diagnostic options' })).toBeInTheDocument();
	});

	it('starts the owned Signal and presents other diagnostics as Learn more only', async () => {
		const signal = buildProductAccess(requireProduct('diagnostic.signal'), entitled('diagnostic.signal'), []);
		const unowned = ['diagnostic.gap', 'diagnostic.direction', 'diagnostic.full'].map((key) =>
			buildProductAccess(requireProduct(key), undefined, [])
		);
		render(DiagnosticPage, {
			props: {
				data: { fullOwned: false, owned: [signal], unowned, stages: [], report: null }
			} as never
		});

		await expect.element(page.getByRole('link', { name: 'Start Signal' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Expand your insight' }))
			.toBeInTheDocument();
		await expect
			.poll(() => page.getByRole('link', { name: 'Learn more' }).elements().length)
			.toBe(3);
	});

	it('presents the Full Diagnostic as one owned three-stage journey', async () => {
		const stageAction = { kind: 'start' as const, label: 'Start', href: '/app/workflow/diagnostic.signal' };
		render(DiagnosticPage, {
			props: {
				data: {
					fullOwned: true,
					owned: [],
					unowned: [],
					stages: [
						{ key: 'diagnostic.signal', name: 'Signal', work: null, action: stageAction },
						{ key: 'diagnostic.gap', name: 'Gap', work: null, action: stageAction },
						{ key: 'diagnostic.direction', name: 'Direction', work: null, action: stageAction }
					],
					report: null
				}
			} as never
		});

		await expect
			.element(page.getByText(/All three diagnostics in one journey/))
			.toBeInTheDocument();
		await expect.element(page.getByText('Integrated Diagnostic report')).toBeInTheDocument();
		await expect.element(page.getByText('Not ready')).toBeInTheDocument();
		await expect.element(page.getByText('Expand your insight')).not.toBeInTheDocument();
	});
});

describe('tools library', () => {
	it('lists the free tool and never a planned product', async () => {
		const products = [
			buildProductAccess(requireProduct('tool.visual_contract'), undefined, []),
			buildProductAccess(requireProduct('tool.think_act_decide'), undefined, [])
		];
		render(ToolsPage, { props: { data: { sections: librarySections(products) } } as never });

		await expect.element(page.getByRole('heading', { name: 'Free tools' })).toBeInTheDocument();
		await expect.element(page.getByText('Visual Contract')).toBeInTheDocument();
		await expect.element(page.getByText('Think, Act, Decide')).not.toBeInTheDocument();
		await expect.element(page.getByRole('heading', { name: 'Your tools' })).not.toBeInTheDocument();
	});

	it('shows at most three recent projects and counts the rest behind View all', async () => {
		const projects = Array.from({ length: 5 }, (_, index) =>
			work({
				id: `project-${index + 1}`,
				productKey: 'tool.visual_contract',
				title: `Project ${index + 1}`,
				lastActivityAt: `2026-10-0${5 - index}T00:00:00.000Z`
			})
		);
		const products = [
			buildProductAccess(requireProduct('tool.visual_contract'), undefined, projects)
		];
		render(ToolsPage, { props: { data: { sections: librarySections(products) } } as never });

		await expect.element(page.getByText('Project 1')).toBeInTheDocument();
		await expect.element(page.getByText('Project 3')).toBeInTheDocument();
		await expect.element(page.getByText('Project 4')).not.toBeInTheDocument();
		await expect.element(page.getByText('Project 5')).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'View all 5 Visual Contract projects' }))
			.toBeInTheDocument();
	});
});

describe('documents', () => {
	const emptyFilters = { family: null, productKey: null, search: '', sort: 'newest' as const };
	const emptyCounts = { diagnostic: 0, strategy: 0, tool: 0 };

	it('shows an empty state with a CTA from the products the user can open', async () => {
		render(DocumentsPage, {
			props: {
				data: {
					documents: [],
					counts: emptyCounts,
					total: 0,
					filters: emptyFilters,
					emptyAction: { label: 'Open Visual Contract', href: '/app/tools/visual-contract' }
				}
			} as never
		});

		await expect.element(page.getByRole('heading', { name: 'No documents yet' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: 'Open Visual Contract' }))
			.toHaveAttribute('href', '/app/tools/visual-contract');
	});

	it('matches actions to the output capabilities', async () => {
		render(DocumentsPage, {
			props: {
				data: {
					documents: [
						{
							id: 'output-1',
							productKey: 'diagnostic.signal',
							workItemId: 'work-1',
							title: 'Signal report',
							format: 'report',
							shareSlug: null,
							canView: true,
							canShare: false,
							canDownload: false,
							createdAt: '2026-10-14T00:00:00.000Z'
						}
					],
					counts: { diagnostic: 1, strategy: 0, tool: 0 },
					total: 1,
					filters: emptyFilters,
					emptyAction: { label: 'Open Signal', href: '/app/diagnostic' }
				}
			} as never
		});

		await expect.element(page.getByRole('link', { name: 'Signal report' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: /Open/ }))
			.toHaveAttribute('href', '/app/documents/output-1');
		await expect.element(page.getByRole('link', { name: /Download/ })).not.toBeInTheDocument();
	});

	it('opens a visual contract on its generated page', async () => {
		render(DocumentsPage, {
			props: {
				data: {
					documents: [
						{
							id: 'output-2',
							productKey: 'tool.visual_contract',
							workItemId: null,
							title: 'Rebrand contract',
							format: 'web_page',
							shareSlug: 'public-id',
							canView: true,
							canShare: true,
							canDownload: false,
							createdAt: '2026-10-14T00:00:00.000Z',
							openPath: '/app/tools/visual-contract/draft-1/generated'
						}
					],
					counts: { diagnostic: 0, strategy: 0, tool: 1 },
					total: 1,
					filters: emptyFilters,
					emptyAction: { label: 'Open Visual Contract', href: '/app/tools/visual-contract' }
				}
			} as never
		});

		await expect
			.element(page.getByRole('link', { name: 'Open' }))
			.toHaveAttribute('href', '/app/tools/visual-contract/draft-1/generated');
	});
});
