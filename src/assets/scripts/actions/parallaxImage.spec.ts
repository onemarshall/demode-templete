// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./gsap", () => ({
	gsap: {
		set: vi.fn(),
		to: vi.fn(() => ({
			kill: vi.fn(),
			scrollTrigger: { kill: vi.fn() },
		})),
	},
	ScrollTrigger: {
		refresh: vi.fn(),
	},
}));

import { gsap, ScrollTrigger } from "./gsap";
import { parallaxImage } from "./parallaxImage";

describe("parallaxImage action", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeImage() {
		return {
			complete: true,
			style: {},
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
	}

	function makeNode(image: unknown) {
		return {
			querySelector: vi.fn(() => image),
		} as unknown as HTMLElement;
	}

	it("initializes immediately when the image is already loaded", () => {
		const image = makeImage();
		const node = makeNode(image);

		const action = parallaxImage(node) as unknown as { destroy: () => void };

		expect(gsap.set).toHaveBeenCalledWith(
			image,
			expect.objectContaining({
				yPercent: -12,
				scale: 1.12,
				transformOrigin: "center center",
			}),
		);
		expect(gsap.to).toHaveBeenCalledWith(
			image,
			expect.objectContaining({
				yPercent: 12,
				scale: 1.12,
				ease: "none",
				scrollTrigger: expect.objectContaining({
					trigger: node,
					start: "top bottom",
					end: "bottom top",
					scrub: true,
				}),
			}),
		);
		expect(ScrollTrigger.refresh).toHaveBeenCalled();

		action.destroy();
	});

	it("waits for image load when not yet complete", () => {
		const image = makeImage();
		image.complete = false;
		const node = makeNode(image);

		parallaxImage(node);

		expect(image.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
		expect(gsap.set).not.toHaveBeenCalled();

		const loadHandler = image.addEventListener.mock.calls[0][1];
		loadHandler();

		expect(gsap.set).toHaveBeenCalledWith(image, expect.any(Object));
		expect(gsap.to).toHaveBeenCalledWith(image, expect.any(Object));
	});

	it("returns an empty destroy function when no image is found", () => {
		const node = makeNode(null);
		const action = parallaxImage(node) as unknown as { destroy: () => void };

		expect(gsap.set).not.toHaveBeenCalled();
		expect(action.destroy).toBeDefined();
	});
});
