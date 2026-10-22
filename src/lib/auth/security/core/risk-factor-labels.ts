/**
 * Human-readable labels for risk factor identifiers.
 *
 * The risk engine emits machine identifiers (`impossible_travel`,
 * `high_risk_country:US`). Those are right for logs and APIs but hard to
 * digest in a review UI. This module renders them as concrete reviewer-facing
 * phrases while the raw identifiers stay available in the stored records.
 */

const FACTOR_LABELS: Record<string, string> = {
  // Network / geo reputation
  vpn_detected: "traffic through a VPN",
  tor_exit_node: "traffic from the Tor network",
  tor_detected: "traffic from the Tor network",
  proxy_detected: "traffic through an open proxy",
  proxy_headers: "request headers indicate a proxy chain",
  datacenter_ip: "request from datacenter infrastructure",
  malicious_ip: "request from a known-malicious IP address",
  suspicious_ip: "IP address flagged as suspicious",
  known_bad_actor: "IP address known to threat intelligence",
  high_hosting_likelihood: "IP address likely belongs to hosting infrastructure",
  medium_hosting_likelihood: "IP address may belong to hosting infrastructure",

  // Account / device behaviour
  new_country: "first activity from this country",
  new_device: "activity from an unrecognized device",
  bot_user_agent: "automated client (bot user agent)",
  suspicious_headers: "unusual request headers",
  unusual_behavior: "activity unlike the account's usual pattern",
  unusual_hour: "activity at an unusual hour for this account",

  // Sign-in / request patterns
  high_failed_attempts: "repeated failed sign-in attempts",
  failed_attempts: "failed sign-in attempts",
  rapid_requests: "unusually rapid requests",
  impossible_travel: "sign-ins from distant locations in quick succession",
  session_hijack_suspected: "possible session hijacking",

  // Monitoring honesty
  feature_error: "a security check could not complete",
};

/**
 * Render one factor identifier as a reviewer-facing phrase.
 * Parameterised factors (`high_risk_country:US`) are expanded;
 * unknown identifiers fall back to de-snake-cased text so new
 * engine factors never surface as raw machine labels.
 */
export function humaniseRiskFactor(factor: unknown): string {
  const raw = typeof factor === "string" ? factor : String(factor ?? "");
  if (raw === "") return "";
  if (raw.startsWith("high_risk_country:")) {
    const country = raw.slice("high_risk_country:".length);
    return `traffic from a high-risk country (${country})`;
  }
  if (raw.startsWith("hosting_likelihood:")) {
    const likelihood = raw.slice("hosting_likelihood:".length);
    if (likelihood === "high") return FACTOR_LABELS.high_hosting_likelihood;
    if (likelihood === "medium") return FACTOR_LABELS.medium_hosting_likelihood;
    return `hosting likelihood: ${likelihood}`;
  }
  return FACTOR_LABELS[raw] ?? raw.replaceAll("_", " ");
}

/**
 * Render a factor list for a sentence position ("High-risk activity: …").
 * Empty input yields an empty string; callers supply their own fallback.
 */
export function humaniseRiskFactors(factors: readonly unknown[] | null | undefined): string {
  if (!factors || factors.length === 0) return "";
  return factors.map(humaniseRiskFactor).filter(Boolean).join(", ");
}
