import { json, type RequestHandler } from "@sveltejs/kit";
import { createAccountExport } from "#lib/modules/auth/server/account-export.js";

export const GET: RequestHandler = async ({ request }) => {
  try {
    const data = await createAccountExport(request.headers);
    const date = new Date().toISOString().slice(0, 10);
    return json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="account-data-${date}.json"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
    const message =
      status === 401 || status === 403
        ? error instanceof Error
          ? error.message
          : "Authentication required"
        : "Your account data could not be prepared. Please try again later.";
    return json(
      { error: message },
      {
        status: status === 401 || status === 403 ? status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
};
