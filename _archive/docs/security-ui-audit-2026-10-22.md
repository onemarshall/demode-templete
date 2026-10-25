# Security UI audit

22 October 2026 · Code-based review · Three specialist sub-agent reviews consolidated

## Implementation update

The recommended changes have now been implemented in the working tree. The findings below remain the historical audit record.

- Today now shows a bounded status and the first three prioritised reviews, with optional filters and secondary dashboard tools.
- Acknowledgement no longer offers a false resolution workflow. Missing monitoring, missing records and filtered-out records have distinct states. A failed refresh retains the last successful sample with a warning.
- Reviews open the selected event/session/IP evidence. Investigation context and exact chart intervals are represented in the URL. Expired review links do not silently show unrelated records.
- Normal investigation context remains visible without flagged incidents. Unsupported device-whitelist and dismissal controls have been removed. IP response controls explain shared-network consequences and provide actual block/unblock requests.
- Security activity, sign-in outcomes, risk distribution and factor comparisons use the installed shadcn/LayerChart infrastructure. UTC bucket boundaries, units, risk thresholds, sample limitations and accessible exact values are explicit.
- Fabricated infrastructure health, device inventory, location, trust, lockout and duration claims have been removed or marked unavailable. Heuristic network/API assessments are described as inferences.
- Account security now starts with protection settings and the next useful step. Sessions lead with recognisable device records; trusted-device wording and server responses reflect actual cookie/session behaviour. Password/hash debug logging was removed.

Validation includes the security server regression suites, browser tests of the dashboard/queue/charts, local Svelte autofixer checks, project type checks and production compilation. Desktop and phone layouts were inspected with sample data; chart-label clipping was corrected. Existing unrelated working-tree edits were preserved.

Remaining source limitations are visible in the product: recent activity is bounded to at most 200 events, not complete historical traffic; authoritative infrastructure health, device inventory and geography require connected sources. No comparative historical baseline is invented.

## Recommendation

Keep the existing Today / Investigate / Trends structure. Make Today a short decision surface, Investigate a contextual evidence surface, and Trends a small collection of charts answering distinct questions. The largest improvement is to connect observations to explanations and actions, while accurately representing what the monitoring system knows.

The existing plain-English redesign is directionally right. Its own `src/routes/(admin)/admin/security/REDESIGN_STATUS.md` already describes the desired questions. The current implementation does not consistently fulfil that intention. Adding more charts before correcting data meaning and action behaviour would make those problems more persuasive.

## Scope and limits

Reviewed the admin security route, its loader/actions, the admin-security panels and triage logic, chart infrastructure, and relevant analytics/SDK data sources. Also reviewed the account security settings, session and trusted-device routes for their information hierarchy. This is a UI, information architecture, and actionability audit, with data-path inspection where needed to assess what the UI claims. It is not a penetration test or a complete authentication implementation review.

Findings reflect the working tree, including existing uncommitted security changes. No application files were modified. No authenticated browser walkthrough, viewport measurement, screen-reader test, or runtime reproduction was performed; responsive and accessibility observations below are code-based risks. The configured Svelte MCP tools were absent from the available tool catalogue. The official shadcn-svelte Chart documentation was checked online; the local Firecrawl route failed DNS resolution, so the web tool was used.

## Current information architecture

| Surface | Current contents | Assessment |
| --- | --- | --- |
| Today | Status hero, three incident summary cards, recommended actions with filters, system health | Appropriate intent; too much framing before the first action, and status confidence is unreliable. |
| Investigate: Recent threats | Threat feed, top risk factors, collapsed security signals | Useful evidence grouping; should open at the incident selected from Today. |
| Investigate: Sign-ins | Authentication metrics and user risk profiles | Healthy sign-in context disappears when there are no user profiles. |
| Investigate: Sessions & devices | Session analytics, trusted devices, flagged sessions | Normal session/device context disappears when no sessions are flagged. |
| Investigate: IPs & network | IP intelligence and blocked IPs | Traffic context disappears when no IPs are blocked. |
| Investigate: API traffic | Rate-limit statistics and API security | API context disappears when the blocked-request count is zero. |
| Trends | Four overview statistics, time analysis, hourly activity, risk distribution, geography | Too many neighbouring summaries, overlapping time views, unclear units and coverage. |
| Account security | Password/email, verification, conditional 2FA/passkeys, links to sessions/devices | Functional settings list; lacks an overall explanation of the account's protection and next useful step. |
| Account sessions | User/current-session details, security feature badges, bulk sign-out, active sessions | Identity metadata precedes the task: recognising and managing signed-in devices. |
| Trusted devices | Trust explanation, current device, 2FA prerequisite, revoke controls | Explains the consequence of trust reasonably well; should distinguish recognition from proof that a device is safe. |

Primary composition: `src/routes/(admin)/admin/security/+page.svelte:426`.

## Findings requiring correction before visual polish

### 1. Acknowledgement can make unresolved risks appear safe — high priority

Acknowledgement adds an ID to a local Set; it performs no mitigation and is lost on reload. Status calculation excludes acknowledged actions, then can announce “You're safe” and “No active threats.” Raw incident counts can still show critical observations elsewhere. System health and monitoring coverage are not inputs to the verdict.

Evidence: `+page.svelte:132`, `:252`; `src/lib/components/admin-security/derive-status.ts:16–50`; `triage/derive.ts:145–167`.

Use separate states for New, Being reviewed, Resolved, and Dismissed with reason. Acknowledgement should change workflow ownership, not the underlying risk assessment. Prefer bounded language such as “No unresolved high-risk activity detected in the available data,” with a separate monitoring-coverage state. Do not assert safety from an empty queue alone.

### 2. Some apparently factual context is hard-coded or inferred — high priority

The SDK constructs operational health with 100% values and successful API statuses. It constructs trusted-device records from low-risk events, supplying macOS/browser details, and supplies US country codes for flagged sessions. Geographic aggregation explicitly uses a demo IP-to-country mapping. User-profile lockout state is inferred from five blocked requests rather than read from an authoritative account-lock state.

Evidence: `src/lib/auth/security/services/sdk.ts:222–290`; `src/lib/auth/security/analytics/metrics.ts:286–300`; `src/lib/auth/security/services/dashboard-analytics.ts:300–317`.

Replace these with measured, authoritative values or clearly labelled Unavailable/Demo/Inferred states. A low-risk event does not establish that a device is trusted. A blocked-request threshold does not prove an account is locked. Withhold geographic visualisation until real location data is connected.

### 3. Recommended action coverage is incomplete, and some controls have no handler — high priority

The rate-limit adapter expects `throttledRequests`, `topLimitedIPs`, and `count`, while the calculator returns `totalBlocked`, `topRateLimitedIPs`, and `blockedCount`. Consequently rate-limit action derivation reads zero/empty values. Flagged-session forms post to `whitelistDevice` and `dismissSession`, but the route defines only block, unblock, and reset actions.

Evidence: `triage/derive.ts:102–123`; `services/dashboard-analytics.ts:157–185`; `FlaggedSessionsList.svelte:261`, `:302`; `src/routes/(admin)/admin/security/+page.server.ts:99–154`.

Align the data contract and implement or remove unavailable controls. The dashboard must distinguish “nothing needs action” from “this source is not represented in the action queue.”

### 4. Investigation hides valid information based on the wrong condition — high priority

Section visibility depends on one count: profiles, flagged sessions, blocked IPs, or blocked requests. These are not measures of whether sign-in, device, IP, or API information exists. The reassuring empty messages overstate what the condition establishes.

Evidence: `+page.svelte:156–162`, `:472–516`.

Always render available overview/context for each area. Put the zero state inside its relevant incident list. Distinguish Healthy, No observations yet, Not configured, Unavailable, and No matches. A zero blocked-IP count should not hide traffic intelligence.

### 5. Chart units, risk ranges, and coverage are inconsistent — high priority

Risk distribution counts events but describes sessions. Hourly activity assigns event counts to both requests and sessions. The risk chart labels a 0–9+ scoring scale, while the risk engine scores 0–100 with boundaries at 40/60/80. Other panels use their own colour thresholds. The SDK asks for the latest 200 events before calculating a nominal 24-hour view, so busy periods can be incomplete.

Evidence: `analytics/metrics.ts:162–179`, `:185–211`; `RiskDistributionChart.svelte:35–97`; `core/risk-engine.ts:94–104`; `HourlyActivityChart.svelte:35–43`; `TimeAnalysisPanel.svelte:123–125`; `services/sdk.ts:201–218`.

Define each measure once: events, requests, distinct sessions, users, or devices. Derive labels/colours from the same risk authority. Show observation window, timezone, sample size, and whether coverage is complete. Retrieve complete aggregates or explicitly label the display as a recent-event sample.

Additional meaning problems affect the surrounding panels. Session analytics derives “active” session counts from IDs seen in events, infers duration from first/last observations, and caps displayed per-user concurrency at five (`services/dashboard-analytics.ts:85–119`). Top risk-factor “contribution” is frequency multiplied by 50, rather than actual risk-engine weight (`analytics/metrics.ts:236`). Incident counts combine feed and session observations that can originate from the same event (`triage/derive.ts:137–167`). Label observed activity honestly, display factor occurrences, and correlate records before presenting a count of distinct incidents. A single event producing several signals should not automatically become several separate tasks.

## Layout and interaction findings

### Today asks users to process too much before acting

The hero, three summary cards, action heading, and a nested filter card all precede the action rows. Rows start with three badges and offer primary action, details, and acknowledgement. “Details” and the primary action run the same panel-navigation behaviour.

Evidence: `+page.svelte:233–250`, `:426–450`; `triage/RecommendedActionsPanel.svelte:64–138`; `triage/QuickFiltersBar.svelte:28`.

Recommended order:

1. One sentence answering “Does anything need attention?”, plus monitoring coverage and last successful observation.
2. Up to three prioritised actions with “What happened / Why it matters / What to do” and one primary button.
3. A compact “View all activity” route and optional filters.
4. A collapsed monitoring-health summary, expanded automatically when coverage needs attention.

Move repeated incident counts into the queue heading or compact links. Consolidate system-health recommendations into the same queue. Keep debug/reset utilities in a secondary administration menu.

### Investigation should preserve the selected entity

The current handler changes section and scrolls to a broad panel. The action item already has entity metadata, but the navigation does not select that record.

Evidence: `+page.svelte:233–245`; `triage/derive.ts:183–196`.

Open an event/session detail Sheet with the selected record, surrounding evidence, known limitations, and a relevant next action. Persist section, entity and time selection in the URL so refresh, back and shared links retain context. Explain the consequences of blocking an IP, revoking access, or changing device trust at the point of action.

### Empty and unavailable states need different language

The queue says “No actions match your current filters” even when there are no actions at all. The overall no-metrics view says “Nothing to worry about yet” and assumes that no events means nobody has signed in. Blocked-IP retrieval can fail and become an empty list. These conditions convey different things.

Evidence: `RecommendedActionsPanel.svelte:96–103`; `+page.svelte:531–541`; `services/sdk.ts:292–318`.

Provide distinct messages and next steps for an empty healthy queue, a filtered queue, a new monitoring setup, a disconnected source, and stale data. Keep last known data visible with a warning when refresh fails. Show last successful refresh separately from data timestamp; the manual refresh currently updates its local timestamp in `finally` (`+page.svelte:70–78`).

### Mobile hierarchy and accessible chart reading need validation

Below the desktop breakpoint the navigation card stacks above the content. Summary cards and filter fields also stack, increasing the distance to the first action. Header controls and some session/IP rows lack responsive wrapping. The hand-built charts rely on colour and native `title` hover text for important values.

Evidence: `+page.svelte:304–334`, `:365–411`; `IncidentSummaryCards.svelte:22`; `FlaggedSessionsList.svelte:64–143`; `BlockedIPsList.svelte:37–55`; `HourlyActivityChart.svelte:29–63`; `TimeAnalysisPanel.svelte:39–54`.

Use compact top-level navigation on mobile, hide optional filters behind a button, and allow action rows and identifiers to wrap. Provide labels, readable units, a text takeaway and an accessible table alternative for charts; verify keyboard/touch interaction rather than assuming the chart library supplies everything. Test keyboard focus after switching investigation sections and respect reduced-motion preferences for scrolling.

## Where shadcn-svelte charts help

The project already includes LayerChart and `src/lib/components/ui/chart/`. The admin-security charts reviewed use hand-built bars instead. The official [Chart documentation](https://shadcn-svelte.com/docs/components/chart) supports composing LayerChart with the project's chart container, configuration and tooltip components. A migration can reuse this foundation; it does not require a new chart system.

| User question | Recommended display | Current source / readiness | Useful next step |
| --- | --- | --- | --- |
| When did suspicious activity happen? | One full-width hourly bar chart with blocked and other events as disjoint series | Hourly activity exposes requests/blocked; correct units and disclose sampling first | Select an hour to inspect its events |
| Are people having trouble signing in? | Grouped successful/failed sign-in bars over time; show failures as count and rate | AuthStats.hourlyRates already exposes timestamped counts; establish complete coverage and consistent summary denominators | Inspect failed attempts in the selected period |
| What proportion of observed activity is high risk? | Compact ordered horizontal bars, with counts and percentages | Existing riskDistribution; correct event/session wording and thresholds first | Filter high/critical event records |
| Which endpoints are receiving attention-worthy traffic? | Ranked horizontal bars with exact counts and threshold explanation | Endpoint counts exist; “abusive” is a heuristic, not a confirmed attack | Inspect the endpoint and sources |
| Where is traffic coming from? | Ranked country list or horizontal bars | Current geographic mapping is demo data; defer | Inspect source records once real geography exists |
| Are things getting better? | Time series plus a comparable previous-period summary | Requires retained, complete comparable aggregates and a defined denominator | Inspect the period responsible for the change |
| What needs action now? | Prioritised list, no chart | Existing triage queue after correctness fixes | Review one concrete incident |
| Is monitoring functioning? | Status rows and last successful observation, no gauge | Requires actual health checks | Restore the unavailable source |

Start with one activity chart and one compact risk comparison. Merge the overlapping hourly/peak views in `TimeAnalysisPanel` and `HourlyActivityChart` into one clear chronology. Keep day-of-week patterns as optional analysis only when enough historical coverage exists. Avoid radar charts, decorative gauges, and a geographic map: they do little to clarify the immediate decision here.

Every chart needs a question heading, one factual takeaway, explicit unit/window/timezone/coverage, readable values, and a clear route to evidence. Do not show prior-period change, a baseline, or a reassuring “normal” judgement until the corresponding data and rules exist. A blocked event can indicate that protection worked; reserve alarm styling for unresolved attention, rather than colouring every blocked event as an emergency.

Risk-factor occurrences are another suitable horizontal-bar comparison in Recent threats, using the existing factor counts. Factors overlap, so this should not be a pie chart. MFA adoption needs a percentage, denominator and next step rather than a decorative gauge. Neither session-duration estimates nor capped concurrency counts currently justify a precise analytical visualisation.

## Account-security hierarchy

Keep personal account security separate from the admin monitoring dashboard. Charts add little to deciding how an individual account is protected.

At `/auth/security`, introduce a small protection summary based on verified account state, followed by the most relevant next step, then authentication methods and device access. Explain why a method is unavailable for the current sign-in type instead of silently hiding every alternative. Do not infer a missing vulnerability solely from use of an external provider.

At `/auth/sessions`, lead with “Do you recognise these signed-in devices?” and the session list. Current user IDs, session IDs, expiry details and feature badges should sit below or within optional details. The device formatter currently takes the first user-agent token, which may produce an unhelpful generic label rather than a recognisable browser/device name.

Evidence: `src/lib/components/profile/tabs/SecurityTab.svelte:180–350`, `:353–387`; `src/routes/auth/(app)/sessions/+page.svelte:71–75`, `:97–229`.

Use plain distinctions between signing out a session and revoking a device's ability to skip 2FA. Keep failures visible until dismissed or corrected; the settings and trusted-device pages currently clear success and error messages after five seconds (`SecurityTab.svelte:150–158`; `trusted-devices/+page.svelte:19–27`).

## Suggested delivery sequence

1. **Restore trust and complete actions:** correct rate-limit adapter, remove unsupported controls, separate acknowledgement/resolution, replace hard-coded operational/device/location claims, expose coverage and partial failures, fix units and risk definitions.
2. **Simplify Today:** compact verdict and coverage, first three actions, one primary CTA per row, optional filters, secondary utilities, distinct empty states.
3. **Repair Investigate:** independent context/incident states, selected-record details, working evidence links, shareable navigation, clear action consequences.
4. **Introduce focused charts:** one activity timeline and one risk comparison using existing shadcn chart infrastructure; remove redundant mini-charts. Add authentication trend data only when complete buckets exist.
5. **Validate the complete experience:** mobile widths, keyboard/touch access, dark mode, long identifiers, no observations, filtered empty, unavailable/stale monitoring, high-volume truncation, acknowledged-but-unresolved incidents, and successful/failed actions. Verify that an admin can identify the next action and explain why it matters without reading every panel.

The target experience is a short answer, a reason to believe it, and a concrete next step. The deeper dashboard remains available when the user has a question that requires it.
