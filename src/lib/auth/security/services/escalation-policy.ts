/**
 * Escalation policy surface.
 *
 * Reads the *running* security configuration (frozen constants in `../config`)
 * and maps it into an admin-legible policy. This is a transparency layer, not
 * a settings store: the dashboard reports the policy that is actually in
 * effect and states plainly that it is not runtime-tunable.
 */

import { securityConfig } from "../config";
import type { EscalationPolicy } from "./dashboard-types";

const CONFIG_FILE = "src/lib/auth/security/config.ts";

export function getEscalationPolicy(): EscalationPolicy {
  const sc = securityConfig;
  return {
    rules: [
      {
        id: "temp-block",
        label: "Repeated failed sign-in attempts",
        trigger: `${sc.abuse.tempBlockTrigger}+ failed attempts`,
        action: "block",
        actionLabel: "Temporary block",
        note: `Duration doubles with each further attempt, starting at ${sc.abuse.tempBlockBase} minute(s) and capped at ${sc.abuse.tempBlockDelayCapMinutes} minutes. Clears on successful sign-in.`,
      },
      {
        id: "captcha",
        label: "Elevated risk score",
        trigger: `Risk score ≥ ${sc.abuse.mediumRiskThreshold}`,
        action: "challenge",
        actionLabel: "Captcha challenge",
        note: `Passing grants a ${Math.round(sc.abuse.captchaBypassSeconds / 60)}-minute bypass; failing adds ${sc.abuse.captchaPenaltyForFailure} risk.`,
      },
      {
        id: "rate-limit",
        label: "Request volume",
        trigger: `More than ${sc.abuse.maxRequestsBeforeRisk} requests in ${sc.abuse.requestWindowSeconds}s`,
        action: "challenge",
        actionLabel: "Throttled",
        note: "Applies to client-initiated auth requests; Better Auth's built-in rate limiter also applies its own limits.",
      },
      {
        id: "risk-block",
        label: "Critical risk score",
        trigger: `Risk score ≥ ${sc.abuse.maxRiskScore}`,
        action: "block",
        actionLabel: "Request blocked",
        note: "Last-resort cap. With the default penalties this is rarely reached; temporary blocks are the realistic auto-block path.",
      },
      {
        id: "bot-ua",
        label: "Automated client signature",
        trigger: "Bot-pattern user agent",
        action: "flag",
        actionLabel: `+${sc.abuse.botRiskBonus} risk`,
        note: "Adds risk that feeds the thresholds above; does not block on its own.",
      },
      {
        id: "private-ip-skip",
        label: "Private and local addresses",
        trigger: "Private or loopback IP",
        action: "skip",
        actionLabel: "Checks skipped",
        note: "Local traffic bypasses abuse detection entirely.",
      },
      {
        id: "fail-open",
        label: "Detection failure",
        trigger: "Abuse check errors",
        action: "skip",
        actionLabel: "Fails open",
        note: "On an internal error the request is allowed with a minimal risk score rather than blocked.",
      },
    ],
    source: "code-config",
    tunable: false,
    configFile: CONFIG_FILE,
    note: "These values are frozen in the running build. Changing them requires a code change and redeploy; runtime tuning is not connected to this dashboard.",
  };
}
