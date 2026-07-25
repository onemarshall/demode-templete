// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./gsap", () => ({
	gsap: {
		registerPlugin: vi.fn(),
	},
	ScrollTrigger: {
		create: vi.fn(() => ({ kill: vi.fn() })),
		refresh: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
}));

vi.mock("gsap/dist/ScrollSmoother", () => ({
	ScrollSmoother: {
		get: vi.fn(() => null),
		registerPlugin: vi.fn(),
	},
}));

import { ScrollTrigger } from "./gsap";
import { featureSticky } from "./featureSticky";

describe("featureSticky action", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeElements() {
		const item = { scrollIntoView: vi.fn() };
		const title = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
		const contentList = {};
		const mediaColumn = { offsetWidth: 10 };
		return { item, title, contentList, mediaColumn };
	}

	it("creates item triggers and calls the initial active change", () => {
		const { item, contentList, mediaColumn } = makeElements();
		const onActiveChange = vi.fn();
		const node = {
			querySelector: vi.fn((selector: string) => {
				if (selector === "[data-sticky-feature-content-list]") return contentList;
				if (selector === "[data-sticky-feature-media]") return mediaColumn;
				return null;
			}),
			querySelectorAll: vi.fn((selector: string) => {
				if (selector === "[data-sticky-feature-item]") return [item];
				return [];
			}),
		} as unknown as HTMLElement;

		featureSticky(node, { onActiveChange });

		expect(onActiveChange).toHaveBeenCalledWith(0);
		expect(ScrollTrigger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: item,
				start: "top center",
				end: "bottom center",
				onEnter: expect.any(Function),
				onEnterBack: expect.any(Function),
			}),
		);
	});

	it("fires the active change callback on enter and enter back", () => {
		const { item } = makeElements();
		const onActiveChange = vi.fn();
		const node = {
			querySelector: vi.fn(() => null),
			querySelectorAll: vi.fn((selector: string) =>
				selector === "[data-sticky-feature-item]" ? [item] : [],
			),
		} as unknown as HTMLElement;

		featureSticky(node, { onActiveChange });

		const { onEnter, onEnterBack } = ScrollTrigger.create.mock.calls[0][0];
		onEnter();
		expect(onActiveChange).toHaveBeenLastCalledWith(0);
		onEnterBack();
		expect(onActiveChange).toHaveBeenLastCalledWith(0);
	});

	it("scrolls the corresponding item into view when a title is clicked", async () => {
		const { item, title } = makeElements();
		const node = {
			querySelector: vi.fn((selector: string) => {
				if (selector === "[data-sticky-feature-content-list]") return {};
				if (selector === "[data-sticky-feature-media]") return { offsetWidth: 10 };
				return null;
			}),
			querySelectorAll: vi.fn((selector: string) => {
				if (selector === "[data-sticky-feature-item]") return [item];
				if (selector === "[data-sticky-feature-title]") return [title];
				return [];
			}),
		} as unknown as HTMLElement;

		featureSticky(node);

		const clickHandler = title.addEventListener.mock.calls.find(
			(call: any[]) => call[0] === "click",
		)?.[1];
		expect(clickHandler).toBeDefined();

		clickHandler?.();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(item.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
	});
});
