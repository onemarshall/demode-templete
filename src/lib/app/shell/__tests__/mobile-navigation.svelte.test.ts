import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import MobileNavWrapper from "./MobileNavWrapper.svelte";

describe("mobile app navigation", () => {
	it("closes the mobile sidebar after selecting a destination", async () => {
		render(MobileNavWrapper);

		await page.getByRole("button", { name: "Open mobile navigation" }).click();
		await expect.element(page.getByTestId("mobile-navigation-state")).toHaveTextContent("open");
		await page.getByRole("link", { name: "Sign-in & security" }).click();
		await expect.element(page.getByTestId("mobile-navigation-state")).toHaveTextContent("closed");
	});
});
