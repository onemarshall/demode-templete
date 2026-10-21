# Security Dashboard Redesign — Status & Action Plan

**Single source of truth for the plain-English redesign of `/admin/security`.**
Update the Status column as work progresses. One file, one place to look.

---

## Guiding principle

The dashboard should answer three questions for a non-technical admin, in this order:

1. **Am I safe right now?** (one-sentence verdict)
2. **What do I need to do today?** (a short list of actions, each with a button)
3. **Where do I look if I want to dig deeper?** (everything else, optional)

Numbers, charts, and jargon are demoted. Decisions and instructions are promoted.

---

## Action plan

| #   | Task                                                                                                                                                  | Files / Components touched                                                                                          | Effort | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| 1   | **Status hero banner** at top of page. One sentence verdict (green / amber / red), one sentence "why", timestamp. Replaces the current 3-row stack.   | New `StatusHero.svelte`. Replaces top of `+page.svelte` (currently `OverviewStats` + `IncidentCommandBar`).         | M      | ☑ Done — mounted above `OverviewStats` on Command Center; `OverviewStats` + `IncidentCommandBar` still render below (not yet removed — leave for task #6 cleanup). |
| 2   | **Verdict logic** — derive overall status (Safe / Watch / Act now) from existing `incidentCounts`, `recommendedActions`, `threatFeed`.                | New helper in `lib/components/admin-security/derive-status.ts`.                                                     | S      | ☑ Done — `deriveSecurityStatus()` in `derive-status.ts`. Thresholds: any critical open → Act now; any high/medium open → Watch; otherwise Safe. |
| 3   | **Rename every panel title** to a plain-English question or instruction (see mapping below).                                                          | Each panel component in `lib/components/admin-security/*`.                                                          | S      | ☑ Done — all 14 panels renamed; descriptions also rewritten in plain English. |
| 4   | **Verdict badges on KPIs** — add a small "Normal / Watch / Act now" badge beside every headline number. Thresholds can start static; refine later.    | `OverviewStats.svelte`, `AuthMetricsPanel.svelte`, `RateLimitStatsPanel.svelte`, `SessionAnalyticsPanel.svelte`.    | M      | ◐ Partial — `OverviewStats` labels relabelled to Normal / Watch / Act now (existing badge pattern reused). The other three panels still use their internal styling and can be tightened in a follow-up. |
| 5   | **Collapse sidebar from 7 tabs to 3**: Today / Investigate / Trends. Move existing 7 views under Investigate as a sub-nav.                            | `+page.svelte` (sidebar block, `sidebarViews` array, `SecurityView` type).                                          | M      | ☑ Done — `Mode` type replaces `SecurityView`. Sidebar shows 3 modes; Investigate expands an indented sub-nav of 5 areas (Recent threats / Sign-ins / Sessions & devices / IPs & network / API traffic). |
| 6   | **Promote Recommended Actions** to hero slot directly under the status banner on the "Today" tab. Rewrite each action as a sentence + single button.  | `RecommendedActionsPanel.svelte`, ordering in `+page.svelte` `command_center` branch.                               | M      | ◐ Mostly done — Today layout is now: StatusHero → IncidentSummaryCards → RecommendedActionsPanel → SystemHealthPanel. `OverviewStats` moved to Trends, `IncidentCommandBar` removed (StatusHero replaces it). The "sentence + single button" rewrite inside `RecommendedActionsPanel` itself is deferred — current 3-button pattern still works. |
| 7   | **Hide charts behind a "Show charts" toggle** per tab. Default view is lists and actions, not graphs.                                                 | `RiskDistributionChart`, `HourlyActivityChart`, `GeographicBreakdown` — wrap in a `<details>` or toggle per branch. | S      | ☑ Done — task #5's Today/Investigate/Trends split already gates `RiskDistributionChart`, `HourlyActivityChart`, `GeographicBreakdown` behind the Trends tab (opt-in). The one remaining decorative chart in an action view (`SecuritySignalsPanel` on Investigate → Recent threats) is now wrapped in a collapsed `<details>` disclosure. |
| 8   | **Colour semantics pass** — reserve red for "act today", amber for "watch", green/grey for "fine". Remove decorative colour from neutral cards.       | Tailwind classes across all `admin-security` panels.                                                                | M      | ☑ Done (header pass) — decorative red removed from `BlockedIPsList` and `ThreatFeedPanel` header icons. State-driven red (e.g. `LiveThreatFeed` connection-lost, row-level severity badges) intentionally kept. StatusHero, OverviewStats badges, and empty state already use red/amber/green semantically. |
| 9   | **Empty-state plain English** — rewrite the "No Security Data Available" block to match the new tone ("Nothing to worry about yet — here's why…").   | Else-branch of `+page.svelte`.                                                                                      | S      | ☑ Done — rewritten with green "safe" card, headline "Nothing to worry about yet.", reassuring plain-English explanation, and softer button labels ("Try signing in" / "Try signing up"). |
| 10  | **Mobile pass** — verify the new hero + 3-tab layout works on phones (admins may check on mobile).                                                    | Layout review only, after #1–#6 land.                                                                               | S      | ☐ Not started |

Effort key: S ≈ < 1 hr, M ≈ 1–3 hrs, L ≈ half-day+.

---

## Panel rename mapping (task #3)

| Current title          | New title                            |
| ---------------------- | ------------------------------------ |
| Auth Metrics           | Are sign-ins healthy?                |
| Rate Limit Stats       | Is anyone hammering us?              |
| IP Intelligence        | Where is traffic coming from?        |
| Flagged Sessions       | Who logged in suspiciously?          |
| Top Risk Factors       | What's driving today's risk?         |
| Blocked IPs            | Who have we blocked?                 |
| Trusted Devices        | Devices you trust                    |
| Session Analytics      | How are people staying signed in?    |
| API Security           | Is the API being abused?             |
| Threat Feed            | What's happened recently?            |
| User Risk Profiles     | Which users look risky?              |
| Time Analysis          | When is activity spiking?            |
| Geographic Breakdown   | Where in the world is activity?      |
| System Health          | Is the security system itself OK?    |

---

## Post-#5 polish round — Investigate sub-nav UX

After the sidebar collapse landed, the Investigate sub-tabs felt like broken
navigation in dev (empty data → blank panels → no feedback on click). Three
small fixes landed to close that loop:

| #    | Fix                                                                                                                              | Status |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P-1  | **Count chips on each sub-nav item.** Live counts derived from the same data each panel renders. Empty tabs render a muted chip. | ☑ Done |
| P-2  | **Per-sub-view empty states.** Green-dashed "all clear" card replaces blank panels. Single `{#snippet emptyState}` shared across all 5 branches for one place to tweak. | ☑ Done |
| P-3  | **Stronger active-state styling on sub-nav.** Active item gets a 2px primary left border, tinted background, bold label, and filled count chip. Inactive items recede. | ☑ Done |

## Suggested implementation order

1. Tasks **#1 + #2** together — biggest visual + conceptual win, low risk. Ship and live with it for a day.
2. Task **#3** — pure rename, fast feedback.
3. Tasks **#5 + #6** — restructure navigation and elevate actions.
4. Task **#4** — verdict badges (depends on thresholds you're comfortable defending).
5. Tasks **#7 + #8 + #9 + #10** — polish.

---

## Open questions (decide before starting)

- **Verdict thresholds.** What count of critical actions = "Act now" vs "Watch"? Suggest: any critical action = red; only medium/low = amber; none = green.
- **Who's the user?** If this dashboard is ever shown to non-admins (e.g. account owners), the rename list should go further (e.g. drop "API" entirely). Confirm audience = site admin only.
- **Charts gone forever, or just collapsed?** Suggest collapsed-by-default with a "Show charts" toggle, so power users can still see them.

---

## Current status — 2026-05-14

**Tasks #1 + #2 + #3 + #5 shipped. Tasks #4 + #6 partially shipped.**

- Sidebar collapsed from 7 tabs to 3 (Today / Investigate / Trends). Investigate expands an indented sub-nav with 5 plain-language areas.
- Today layout is now: StatusHero → IncidentSummaryCards → RecommendedActionsPanel → SystemHealthPanel. OverviewStats moved to Trends. IncidentCommandBar removed entirely (StatusHero supersedes it).
- KPI badge labels in OverviewStats now read "Normal / Watch / Act now" instead of "Operational / Degraded / Critical".
- No new typecheck errors.

**Deferred (small):**
- Verdict badges in the other 3 panels (Auth / Rate Limit / Session Analytics) — internal styling still varies; cleanup pass needed.
- Rewriting individual rows inside `RecommendedActionsPanel.svelte` to a single-button "sentence + button" pattern. Current 3-button row (primary / details / acknowledge) still works.

**Post-#5 polish round shipped** (count chips, per-sub-view empty states, active sub-nav styling). The Investigate tab now reads as deliberate "you're safe" feedback even when data is sparse.

**Next up:** task #10 (mobile pass). Open in a phone-sized viewport and verify the StatusHero, sidebar collapse, and Today layout still read well.
