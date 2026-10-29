---
id: 01-Extraction-Confirmation-Protocol
title: Module 01 Extraction and Confirmation Protocol
description: Local M01 control for preserving founder words and confirming any interpretation before natural follow-up.
type: module-protocol
version: 1.0
last-updated: '2026-08-28'
status: active
depends-on:
- 01-Prompt
- FW_35-Meaning-Translation-and-Confirmation-Contract
feeds-into:
- 01-Handoff-Pack
---

# Module 01 Extraction and Confirmation Protocol

## Purpose

After a founder answers a question about lived experience, preserve their words before a facilitator or model draws a conclusion. This protocol applies the existing M01 Meaning Record requirement and `FW_35` within Module 01. It creates no new framework authority.

## Required sequence

1. Preserve the answer verbatim with its source/event ID, authorised respondent, authorised single scope and `direct-founder-statement` evidence class.
2. Create a candidate extraction. It may contain only exact words, a bounded observation, scope, evidence class, prohibited upgrades, and a nullable candidate interpretation. Any interpretation is `provisional` and names an alternative or `remains_unclear`.
3. Render this confirmation turn deterministically:

   > You said: “[exact words]”
   >
   > I am not treating that as a conclusion. Is the bounded reading—this was one lived situation in the authorised scope—accurate, should you correct it, or does it remain unclear?

4. Record the authorised source’s exact response as `confirmed`, `corrected`, `unclear`, `not-established` or `return-upstream`. Only `confirmed` releases the exact words, authorised scope and confirmed bounded reading to the next M01 conversation step.
5. If corrected, unclear, not established or returned, keep the item provisional. It cannot support a lock, conclusion, evidence upgrade or downstream handoff.

## Prohibited upgrades

Do not add motive, necessity, family/client judgement, source origin, offer/buyer relationship, priority, business decision or another scope. A facilitator may not treat silence, polish or an earlier phrase as confirmation.

## Bounded natural continuation

After confirmation, pass only these items to the next natural conversation step:

- the confirmed exact words;
- the authorised scope;
- the direct-statement evidence class;
- the confirmation-event ID;
- one permitted question job; and
- the prohibited-upgrade list.

Do not pass unresolved raw material or let the continuation create a conclusion. Empty Ground, conflict, permission/privacy, authority, route and Handoff Pack controls still apply.

**DeMode™**
