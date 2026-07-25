// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./gsap", () => ({
	gsap: {
		set: vi.fn(),
		to: vi.fn(),
	},
	ScrollTrigger: {
		create: vi.fn(() => ({ kill: vi.fn() })),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	},
}));

import { gsap, ScrollTrigger } from "./gsap";
import { numberCounter } from "./numberCounter";

describe("numberCounter action", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sets the initial value and creates a ScrollTrigger", () => {
		const node = { textContent: "" } as unknown as HTMLElement;
		const action = numberCounter(node, { value: 1000 });

		expect(node.textContent).toBe("0");
		expect(ScrollTrigger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				trigger: node,
				start: "top 80%",
				once: true,
			}),
		);

		action.destroy();
		expect(ScrollTrigger.create.mock.results[0].value.kill).toHaveBeenCalled();
	});

	it("formats with prefix, suffix, decimals and separator", () => {
		const node = { textContent: "" } as unknown as HTMLElement;
		numberCounter(node, {
			value: 1234.5,
			from: 0,
			prefix: "$",
			suffix: "+",
			decimals: 1,
			separator: ",",
		});

		expect(node.textContent).toBe("$0.0+");

		const { onEnter } = ScrollTrigger.create.mock.calls[0][0];
		onEnter();

		expect(gsap.to).toHaveBeenCalledWith(
			expect.objectContaining({ v: 0 }),
			expect.objectContaining({
				v: 1234.5,
				duration: 2,
				ease: "power2.out",
			}),
		);

		const { onUpdate } = gsap.to.mock.calls[0][1];
		onUpdate.call({ targets: () => [{ v: 617.25 }] });
		expect(node.textContent).toBe("$617.3+");
	});

	it("uses custom start and once values", () => {
		const node = { textContent: "" } as unknown as HTMLElement;
		numberCounter(node, { value: 100, start: "top 90%", once: false });

		expect(ScrollTrigger.create).toHaveBeenCalledWith(
			expect.objectContaining({ start: "top 90%", once: false }),
		);
	});
});
