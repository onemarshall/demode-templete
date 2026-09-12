/**
 * Minimal scoped logger.
 *
 * Prefixes messages with a `[Scope:Name]` tag and dedupes identical
 * messages emitted within a short window (per Worker isolate).
 */

export interface ScopedLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

const DEDUPE_MS = 5_000;
const MAX_SEEN = 1_000;
const seen = new Map<string, number>();

const shouldLog = (method: keyof ScopedLogger, tag: string, args: unknown[]): boolean => {
  const key = `${method}:${tag}:${args.map(String).join(" ")}`;
  const now = Date.now();
  const last = seen.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return false;
  if (seen.size >= MAX_SEEN) seen.clear();
  seen.set(key, now);
  return true;
};

const toTagPart = (part: string): string =>
  part
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-./\\]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/**
 * Create a scoped logger from tag parts.
 *
 * @example
 * const log = createScopedLogger(['Directus', 'Pages']);
 * log.info('Fetched'); // [Directus:Pages] Fetched
 */
export function createScopedLogger(parts: (string | undefined)[]): ScopedLogger {
  const tag = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(toTagPart)
    .join(":");
  const prefix = tag ? `[${tag}]` : "";

  return {
    info: (...args: unknown[]) => {
      if (shouldLog("info", tag, args)) console.info(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      if (shouldLog("warn", tag, args)) console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      if (shouldLog("error", tag, args)) console.error(prefix, ...args);
    },
    debug: (...args: unknown[]) => {
      if (import.meta.env.DEV && shouldLog("debug", tag, args)) {
        console.debug(prefix, ...args);
      }
    },
  };
}
