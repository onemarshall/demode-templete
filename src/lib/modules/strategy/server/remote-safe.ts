/**
 * Shared transport helpers for `*.remote.ts` modules.
 *
 * Every remote module wraps its API calls in `safe`/`safeAsync` so that a
 * deliberate `HttpError` (400/404/409/502/503, …) raised by the underlying
 * `*Error` helper survives the hop, while an untyped failure (ZodError,
 * ENOENT, …) is translated into the module's own status code. The shape of
 * that translation is module-specific (m04 maps to 404/409/422, m01 keeps
 * 400, …), so only the *wrapper* is shared here — the error function itself
 * is injected.
 *
 * Usage:
 *
 * ```ts
 * import { makeSafe } from "#lib/server/remote-safe";
 * const { safe, safeAsync } = makeSafe(m04Error);
 * ```
 */
import { isHttpError } from "@sveltejs/kit";

export function makeSafe(errorFn: (e: unknown) => never): {
  safe: <T>(fn: () => T) => T;
  safeAsync: <T>(fn: () => Promise<T>) => Promise<T>;
} {
  const safe = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (e) {
      if (isHttpError(e)) throw e;
      errorFn(e);
    }
  };

  const safeAsync = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (isHttpError(e)) throw e;
      errorFn(e);
    }
  };

  return { safe, safeAsync };
}
