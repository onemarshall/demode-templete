---
id: semantic-inheritance-ledger-template
title: Semantic Inheritance Ledger Template
description: Trace inherited brand meanings and their approved use in downstream expression.
type: internal-runtime-template
version: 1.1
last-updated: 2026-10-04
status: active
depends-on:
- ../framework/FW_28-Business-Foundation-Document-Contract.md
- ../framework/FW_34-Brand-Semantic-Derivation-and-Promotion-Contract.md
feeds-into:
- ../05-Brand-Strategy/05-Prompt.md
- ../05-Brand-Strategy/05-Strategy-Schema.md
---

# Semantic Inheritance Ledger

```yaml
schema: semantic-inheritance-ledger
schema-version: 1.0
ledger-id: [stable ID]
business-id: [ID]
run-id: [ID]
generated-at: [timestamp]
generator-contract: FW_34 v1.0
foundation:
  id: [ID]
  version: [version]
  sha256: [exact hash]
sources:
  m01: [ID/version/hash]
  m02: [ID/version/hash]
  m03: [ID/version/hash]
  m04: [ID/version/hash]
  route-authorization: [ID/version/hash]
  commercial-foundation: [ID/version/hash or not-used]
  claims-authority: [ID/version/hash]
validation-state: pending | passed | failed
stale-state: current | stale
stale-when: [exact consumed authority, evidence or permission change]
```

## Items

Repeat for every material inherited or candidate item:

```yaml
- source-id: [stable source or statement ID]
  source-section: [exact section]
  exact-source-language: [verbatim]
  meaning-record-ref: [ID / version / confirmation state, or required before use]
  confirmed-meaning: [reverse-expansion sentence]
  semantic-role: [FW_34 role]
  authority-level: fixed-source | approved-decision | evidence-bounded | derived-strategy | expression-candidate
  must-preserve: exact | meaning | scope | no
  may-translate: yes | no | context-only
  expression-permission: internal-only | public-within-boundary | role-specific | prohibited
  promotion-permission: prohibited | gate-required | already-authorised-for-role
  promotion-requires-reason: yes | no
  public-copy-state: fixed-authority | candidate | approved-for-role | qualified | prohibited
  headline-permission: yes | no | gate-required
  known-boundaries: []
  evidence-state: substantiated | qualified | illustrative | hypothesis | cannot-claim | not-applicable
  invalidation-condition: [condition]
```

## Exact-authority check

- Governing Declarations reproduced exactly: `pass | fail`
- Core Belief reproduced from its owner: `pass | fail`
- approved buyer, offer, route and claims boundary reproduced from their owners: `pass | fail`
- compatible derived language falsely labelled inherited: `none | list and fail`
- load-bearing unclassified item: `none | list and fail`

## Hierarchy map

Record Levels 1–14 from FW_34 with the ledger item IDs that support each level. Distinguish inherited authority, M05 decision and expression. Name the governing-idea collapse point.

## Promotion records

For each proposed move, record the complete FW_34 Promotion Gate. A rejected promotion remains decision evidence and never appears as accepted authority downstream.

## Validation

Pass only when source hashes match, every load-bearing item is classified, each material item has a current confirmed Meaning Record, exact authorities match their owners, no label enlarges authority, the hierarchy is complete before schema generation and every proposed promotion has a reasoned decision.

<!-- Template maintenance 1.1, 2026-10-04: source/reader corrections and HumanWriting pass; see internal remediation record 28. -->
