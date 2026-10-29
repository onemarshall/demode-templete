import { lookup } from "node:dns/promises";
import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { Artifact } from "../stages/m02/evidence";

const USER_AGENT = "Langfell-M02-Evidence-Fetch/1.0 (+public artifact gather)";
const ACCEPT = "text/html,application/xhtml+xml,application/json,text/plain;q=0.9";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BYTES = 700_000;
const MAX_TEXT = 60_000;
const MAX_REDIRECTS = 3;

export type M02CollectedArtifact = Omit<ReturnType<typeof Artifact.parse>, "id"> & { httpStatus: number };
export interface M02UrlCollectionInput {
  url: string;
  kind: "competitor" | "customer" | "market" | "owned";
  target: string;
  note?: string;
}
export interface M02UrlRequestResponse {
  status: number;
  headers: { "content-type"?: string; location?: string };
  body: AsyncIterable<Uint8Array>;
  cancel?: () => void;
}
export interface M02UrlCollectorDependencies {
  resolve?: (hostname: string) => Promise<Array<{ address: string; family: number }>>;
  request?: (input: { url: URL; address: string; signal: AbortSignal; headers: Record<string, string> }) => Promise<M02UrlRequestResponse>;
  now?: () => string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

const IPV4_BLOCKED = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
];
const IPV6_BLOCKED = [
  "::/128", "::1/128", "::ffff:0:0/96", "64:ff9b:1::/48", "100::/64", "2001::/23",
  "2001:db8::/32", "2002::/16", "fc00::/7", "fe80::/10", "ff00::/8",
];
const blocked = new Map<number, Array<{ network: bigint; prefix: number }>>();

function ipv4Value(address: string): bigint {
  return address.split(".").reduce((value, octet) => (value << 8n) | BigInt(Number(octet)), 0n);
}

function ipv6Value(address: string): bigint | null {
  let input = address.toLowerCase();
  if (input.includes(".")) {
    const split = input.lastIndexOf(":");
    const tail = input.slice(split + 1);
    if (isIP(tail) !== 4) return null;
    const value = ipv4Value(tail);
    input = `${input.slice(0, split)}:${((value >> 16n) & 0xffffn).toString(16)}:${(value & 0xffffn).toString(16)}`;
  }
  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - left.length - right.length : 0;
  const groups = halves.length === 2 ? [...left, ...Array(Math.max(0, fill)).fill("0"), ...right] : left;
  if (groups.length !== 8 || groups.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return groups.reduce((value, part) => (value << 16n) | BigInt(parseInt(part, 16)), 0n);
}

function parseCidr(value: string, family: number) {
  const [address, prefixText] = value.split("/");
  const prefix = Number(prefixText);
  const network = family === 4 ? ipv4Value(address!) : ipv6Value(address!);
  if (network === null) throw new Error("Invalid internal address range");
  return { network, prefix };
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family !== 4 && family !== 6) return true;
  let ranges = blocked.get(family);
  if (!ranges) {
    const strings = family === 4 ? IPV4_BLOCKED : IPV6_BLOCKED;
    ranges = strings.map((range) => parseCidr(range, family));
    blocked.set(family, ranges);
  }
  const value = family === 4 ? ipv4Value(address) : ipv6Value(address);
  if (value === null) return true;
  const bits = family === 4 ? 32 : 128;
  if (family === 6 && (value >> 125n) !== 1n) return true; // Only global-unicast 2000::/3 is routable here.
  return ranges.some(({ network, prefix }) => {
    const shift = BigInt(bits - prefix);
    return (value >> shift) === (network >> shift);
  });
}

function normalizeUrl(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("not a safe HTTPS URL"); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !host || host.includes("%"))
    throw new Error("not a safe HTTPS URL");
  if (isIP(host) === 6) throw new Error("IPv6 literal destinations are not supported");
  if (!isIP(host) && (!host.includes(".") || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)))
    throw new Error("local or reserved hostnames are not allowed");
  url.hash = "";
  return url;
}

async function resolvePublicV4(hostname: string, resolver: NonNullable<M02UrlCollectorDependencies["resolve"]>) {
  if (isIP(hostname) === 4) {
    if (isBlockedAddress(hostname)) throw new Error("destination host resolves to a non-public address");
    return hostname;
  }
  let rows: Array<{ address: string; family: number }>;
  try { rows = await resolver(hostname); } catch { throw new Error("DNS lookup failed — no public address found"); }
  if (!rows.length || rows.some((row) => isBlockedAddress(row.address)))
    throw new Error("destination host resolves to a non-public address");
  const ipv4 = rows.find((row) => row.family === 4 && isIP(row.address) === 4);
  if (!ipv4) throw new Error("destination host has no public IPv4 address");
  return ipv4.address;
}

async function systemResolve(hostname: string) {
  return lookup(hostname, { all: true, verbatim: true });
}

function withDeadline<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error("request timeout"));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new Error("request timeout"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function systemRequest(input: { url: URL; address: string; signal: AbortSignal; headers: Record<string, string> }): Promise<M02UrlRequestResponse> {
  return new Promise((resolve, reject) => {
    const options: RequestOptions = {
      protocol: "https:",
      hostname: input.url.hostname,
      port: 443,
      family: 4,
      method: "GET",
      path: `${input.url.pathname}${input.url.search}`,
      headers: input.headers,
      signal: input.signal,
      // Preserve Host/SNI for TLS while connecting only to the prevalidated IP.
      lookup: (_hostname, _options, callback) => callback(null, input.address, 4),
    };
    const req = httpsRequest(options, (res: IncomingMessage) => resolve({
      status: res.statusCode ?? 0,
      headers: {
        "content-type": typeof res.headers["content-type"] === "string" ? res.headers["content-type"] : undefined,
        location: typeof res.headers.location === "string" ? res.headers.location : undefined,
      },
      body: res,
      cancel: () => res.destroy(),
    }));
    req.once("error", reject);
    req.end();
  });
}

const BLOCK = /<(script|style|noscript|svg|iframe|form|select|template)\b[\s\S]*?<\/\s*\1\s*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/\s*h\1\s*>/gi;
const BREAK = /<(br|\/p|\/div|\/li|\/tr|\/section|\/article|\/header|\/footer|\/h[1-6]|\/ul|\/ol|\/table|\/blockquote)\b[^>]*>/gi;
const TAG = /<[^>]+>/g;
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…",
};
function decodeEntities(text: string) {
  const numeric = (raw: string, radix: number) => {
    const value = Number.parseInt(raw, radix);
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
      ? String.fromCodePoint(value)
      : `&#${radix === 16 ? "x" : ""}${raw};`;
  };
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => numeric(hex, 16))
    .replace(/&#(\d+);/g, (_, dec: string) => numeric(dec, 10))
    .replace(/&([a-z]+);/gi, (_, name: string) => ENTITIES[name.toLowerCase()] ?? `&${name};`);
}

/** Extraction semantics retained from the legacy M02 collector. */
export function htmlToM02Text(html: string): { title: string; text: string } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]
    ?? "";
  let text = html
    .replace(BLOCK, " ")
    .replace(COMMENT, " ")
    .replace(HEADING, (_whole, _level, inner: string) => `\n\n${inner.replace(TAG, " ").trim()}\n`)
    .replace(BREAK, "\n")
    .replace(TAG, " ");
  text = decodeEntities(text).replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (description.trim()) text = `${decodeEntities(description).trim()}\n\n${text}`;
  return { title, text: text.slice(0, MAX_TEXT) };
}

function safeError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && error.name === "AbortError") return `timed out after ${Math.ceil(timeoutMs / 1000)}s`;
  const message = error instanceof Error ? error.message : "request failed";
  if (/oversized|byte limit/i.test(message)) return "page exceeded the 700 KB capture limit";
  if (/content[- ]type/i.test(message)) return "unsupported content type";
  if (/no usable content/i.test(message)) return "page returned no usable content";
  if (/dns|address|public|reserved|local|https url|redirect|ipv6/i.test(message)) return message;
  if (/HTTP \d+/.test(message)) return message;
  if (/certificate|TLS/i.test(message)) return "TLS certificate problem";
  if (/ECONNREFUSED/i.test(message)) return "connection refused";
  if (/ETIMEDOUT|timeout/i.test(message)) return "connection timed out";
  return "public page request failed";
}

async function readBounded(response: M02UrlRequestResponse, maxBytes: number, signal: AbortSignal) {
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for await (const chunk of response.body) {
      if (signal.aborted) throw new Error("request timeout");
      size += chunk.byteLength;
      if (size > maxBytes) throw new Error("response exceeded byte limit");
      chunks.push(chunk);
    }
  } catch (error) {
    response.cancel?.();
    throw error;
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}

/** Collect one public HTTPS page. Failed attempts are returned as failed artifacts for the M02 log. */
export async function collectM02Url(
  input: M02UrlCollectionInput,
  dependencies: M02UrlCollectorDependencies = {},
): Promise<{ artifacts: M02CollectedArtifact[] }> {
  const retrievedAt = (dependencies.now ?? (() => new Date().toISOString()))();
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = dependencies.maxBytes ?? DEFAULT_MAX_BYTES;
  const resolver = dependencies.resolve ?? systemResolve;
  const request = dependencies.request ?? systemRequest;
  const maxRedirects = dependencies.maxRedirects ?? MAX_REDIRECTS;
  let requestedUrl = input.url;
  let finalUrl = "";
  let status = 0;
  let title = "";
  let text = "";
  let error: string | undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request timeout")), timeoutMs);
  try {
    let url = normalizeUrl(input.url);
    requestedUrl = url.toString();
    for (let redirects = 0; ; redirects++) {
      if (controller.signal.aborted) throw new Error("request timeout");
      finalUrl = url.toString();
      const address = await withDeadline(resolvePublicV4(url.hostname, resolver), controller.signal);
      const response = await withDeadline(request({
        url,
        address,
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: ACCEPT },
      }), controller.signal);
      status = response.status;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.cancel?.();
        if (redirects >= maxRedirects) throw new Error("redirect limit exceeded");
        url = normalizeUrl(new URL(response.headers.location, url).toString());
        continue;
      }
      if (status < 200 || status >= 300) {
        response.cancel?.();
        throw new Error(`HTTP ${status}`);
      }
      const contentType = (response.headers["content-type"] ?? "").split(";", 1)[0]!.trim().toLowerCase();
      if (!new Set(["text/html", "application/xhtml+xml", "text/plain", "application/json"]).has(contentType)) {
        response.cancel?.();
        throw new Error("unsupported content type");
      }
      const body = await readBounded(response, maxBytes, controller.signal);
      const extracted = contentType === "text/html" || contentType === "application/xhtml+xml"
        ? htmlToM02Text(body)
        : { title: "", text: body.slice(0, MAX_TEXT) };
      title = extracted.title;
      text = extracted.text;
      if (!text.trim()) throw new Error("page returned no usable content");
      break;
    }
  } catch (caught) {
    error = controller.signal.aborted ? `timed out after ${Math.ceil(timeoutMs / 1000)}s` : safeError(caught, timeoutMs);
  } finally {
    clearTimeout(timer);
  }

  const artifact = Artifact.omit({ id: true }).parse({
    kind: input.kind,
    channel: "url_fetch",
    target: input.target,
    source: "Public web page",
    url: requestedUrl,
    finalUrl,
    retrievedAt,
    ...(title ? { title } : {}),
    ...(error ? {} : { verbatim: text }),
    access: "public",
    consent: "public artifact",
    status: error ? "failed" : "gathered",
    ...(error ? { error } : {}),
    ...(input.note ? { note: input.note } : {}),
  });
  return { artifacts: [{ ...artifact, httpStatus: status }] };
}
