---
id: 08_08-Proof-Aligned-Calendar-Framework
title: Proof Production Priorities
description: This output ranks proof work.
type: module-deliverable
version: 3.0
last-updated: 2026-07-13
status: deprecated
superseded-by: 08-Prompt
reason: Component prompts are consolidated into 08-Prompt.md. This retained filename is a compatibility alias for the 08_08 Proof Production Priorities output shape.
depends-on:
- 08-Prompt
- 08-Strategy-Schema
- 05-Handoff-Pack
feeds-into:
- 08_13-Content-Handoff-Pack
- 11-Prompt
---

# 08_08 Proof Production Priorities

This output ranks proof work. It does not create a content calendar or publishing cadence.

## Output shape

```text
## 08_08 Proof Production Priorities

### Production Constraints
- evidence available
- permission required
- production capability
- claims and human review

### Proof Gap Priority Sequence
| Priority | Asset | Pillar | Proof tier | Gap closed | Evidence needed | Ready? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [asset] | [pillar] | [tier] | [gap] | [source/permission] | [Y/N] |

### Tier Rules
- no light distribution asset without a stronger proof source
- reuse does not upgrade evidence
- client evidence requires outcome documentation and permission

### Module 11 Handoff
- ranked assets Module 11 may commission
- production and evidence constraints
- no quantities, cadence, dates, targets or thresholds
```

## Gate

Every priority must close a named proof gap and identify its evidence requirement. Any content calendar, publishing frequency or production quota fails this output.
