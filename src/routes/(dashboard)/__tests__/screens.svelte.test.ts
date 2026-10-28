import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import "../../../app.css";
import OrganisationsPage from "../organisations/+page.svelte";
import OrganisationSettingsPage from "../o/[organisationSlug]/settings/+page.svelte";
import BrandPage from "../o/[organisationSlug]/[brandSlug]/+page.svelte";
import InvitationPage from "../invite/[invitationId]/+page.svelte";

const organisationId = "org-internal-1";
const brandId = "brand-internal-1";
const userId = "user-internal-1";
const invitationId = "invitation-internal-1";

describe("Montsel screens", () => {
  it("shows the organisations and assigned brand navigation without exposing database IDs", async () => {
    render(OrganisationsPage, {
      props: {
        data: {
          user: { id: userId },
          preference: { lastBrandId: brandId },
          organisations: [
            {
              organisationId,
              organisationName: "Acme Studio",
              organisationSlug: "acme-studio",
              role: "owner",
              brands: [{ brandId, brandName: "Brand One", brandSlug: "brand-one", role: "editor" }],
            },
          ],
        },
      } as never,
    });

    await expect
      .element(page.getByRole("heading", { name: "Your organisations" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Brand One" }))
      .toHaveAttribute("href", "/o/acme-studio/brand-one");
    await expect
      .element(page.getByRole("link", { name: "Organisation settings" }))
      .toHaveAttribute("href", "/o/acme-studio/settings");
    await expect.element(page.getByRole("button", { name: "Add brand" })).toBeInTheDocument();
    await expect.element(page.getByText(organisationId, { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText(brandId, { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText(userId, { exact: true })).not.toBeInTheDocument();
  });

  it("hides brand creation from an ordinary organisation member", async () => {
    render(OrganisationsPage, {
      props: {
        data: {
          user: { id: userId },
          preference: { lastBrandId: null },
          organisations: [
            {
              organisationId,
              organisationName: "Acme Studio",
              organisationSlug: "acme-studio",
              role: "member",
              brands: [],
            },
          ],
        },
      } as never,
    });

    await expect
      .element(page.getByText("No brands assigned to you here yet.", { exact: false }))
      .toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Add brand" })).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: "Organisation settings" }))
      .toBeInTheDocument();
  });

  it("shows the owner controls and brand setup status without rendering internal IDs", async () => {
    render(OrganisationSettingsPage, {
      props: {
        data: {
          user: { id: userId },
          organisation: { id: organisationId, name: "Acme Studio", slug: "acme-studio" },
          role: "owner",
          manager: true,
          brands: [{ id: brandId, name: "Brand One", status: "active" }],
          members: [
            {
              userId,
              name: "Avery Owner",
              email: "avery@example.test",
              role: "owner",
              emailVerified: true,
            },
          ],
          invitations: [
            {
              id: "provisioning-internal-1",
              invitationId,
              email: "new@example.test",
              state: "retry_pending",
              attempts: 2,
            },
          ],
        },
      } as never,
    });

    await expect.element(page.getByRole("heading", { name: "Acme Studio" })).toBeInTheDocument();
    await expect.element(page.getByText("Grant brand access", { exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Create brand" })).toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Retry setup" })).toBeInTheDocument();
    await expect.element(page.getByText(organisationId, { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText(brandId, { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText(userId, { exact: true })).not.toBeInTheDocument();
    await expect.element(page.getByText(invitationId, { exact: true })).not.toBeInTheDocument();
  });

  it("keeps grant controls hidden for an organisation admin and invitation controls hidden for a brand viewer", async () => {
    render(OrganisationSettingsPage, {
      props: {
        data: {
          user: { id: userId },
          organisation: { id: organisationId, name: "Acme Studio", slug: "acme-studio" },
          role: "admin",
          manager: true,
          brands: [],
          members: [],
          invitations: [],
        },
      } as never,
    });
    await expect.element(page.getByRole("button", { name: "Create brand" })).toBeInTheDocument();
    await expect
      .element(page.getByText("Grant brand access", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Transfer ownership" }))
      .not.toBeInTheDocument();

    render(BrandPage, {
      props: {
        data: {
          route: {
            organisation: { id: organisationId, name: "Acme Studio", slug: "acme-studio" },
            brand: { id: brandId, name: "Brand One", slug: "brand-one" },
          },
          role: "viewer",
          manager: false,
          canInvite: false,
          members: [],
          audit: [],
          availableMembers: [],
        },
      } as never,
    });
    await expect.element(page.getByRole("heading", { name: "Brand One" })).toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Send invitation" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Update member access" }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Save name" })).not.toBeInTheDocument();
  });

  it("shows recipient actions for a verified pending invitation without exposing its ID", async () => {
    render(InvitationPage, {
      props: {
        data: {
          invitation: {
            invitationId,
            organisationName: "Acme Studio",
            status: "pending",
            state: "pending_acceptance",
            expiresAt: new Date("2026-11-01T12:00:00.000Z"),
          },
          emailVerified: true,
        },
      } as never,
    });

    await expect.element(page.getByText("Join Acme Studio", { exact: true })).toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "Accept invitation" }))
      .toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    await expect.element(page.getByText(invitationId, { exact: true })).not.toBeInTheDocument();
  });
});
