import {
  SPINE_LABELS,
  type ClientDecision,
  type FoundationDoc,
  type Manifesto,
  type Spine,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(
      /\bM0[1-9]\b|\bM1[0-2]\b/g,
      (id) =>
        ({
          M01: "the conviction conversation",
          M02: "the market reality work",
          M03: "the business commitments work",
          M04: "the viability check",
          M05: "Brand Strategy",
          M06: "Marketing Strategy",
          M07: "Sales Strategy",
          M08: "Content Strategy",
          M09: "Digital Strategy",
          M10: "Visual Strategy",
          M11: "Strategic Coordination",
          M12: "Work Coordination",
        })[id] ?? id,
    )
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const cell = (value: string) => clean(value).replace(/\|/g, "\\|").replace(/\n+/g, " ");

const table = (headers: string[], rows: string[][]) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");

export const APPROVAL_STATEMENT =
  "Yes, this is our business, and this is where we stand. This document accurately states what the business is, why it exists, who it serves, what it produces and offers, the practical outcome customers receive, what makes it distinct, where essential how it creates that value, and what those decisions commit us to.";

export function renderBF(
  doc: FoundationDoc,
  manifesto: Manifesto,
  approval: ClientDecision | null,
  version: number,
) {
  const date = new Date().toISOString().slice(0, 10);
  const mechanism = doc.operatingMechanism;
  const needsMechanism =
    doc.explanatoryDependency === "required" || doc.explanatoryDependency === "helpful";

  return `---
title: ${clean(doc.business)} — Business Foundation
description: What ${clean(doc.business)} is and the commitments that govern it
order: 2
document-type: business-foundation
version: ${version}
date: ${date}
---

> **Questions for approval:** Have we correctly understood this business? Is this where the business is prepared to stand?

## What this document is for
---

${clean(doc.purposeText)}

## Executive Overview
---

### The business in plain terms

${clean(doc.plainTerms)}

### At a glance

- **Business or purchase form:** ${clean(doc.atAGlance.form)}
- **What customers can buy now:** ${clean(doc.atAGlance.buyNow)}
- **Who pays:** ${clean(doc.atAGlance.payer)}
- **Who uses it:** ${clean(doc.atAGlance.user)}
- **What causes the purchase:** ${clean(doc.atAGlance.trigger)}
- **What the customer receives:** ${clean(doc.atAGlance.receives)}
- **How it is delivered or used:** ${clean(doc.atAGlance.delivery)}
- **Where it operates:** ${clean(doc.atAGlance.operates)}

## Strategic foundation and governing decisions
---

### What the business is

${clean(doc.whatTheBusinessIs)}

### Why it exists

${clean(doc.whyItExists)}

### Who it serves

${clean(doc.whoItServes)}

### What it produces

${clean(doc.whatItProduces)}

### Products and services

${table(
  ["Product or service", "What it is", "Who it is for", "Current state"],
  doc.productsServices.map((product) => [product.name, product.what, product.whoFor, product.state]),
)}

### Portfolio and offer architecture

This Foundation covers ${doc.scope === "whole-business" ? "the whole business" : doc.scope === "portfolio" ? "a brand portfolio" : "one individual offer"}.

${table(
  ["Offer or portfolio item", "Strategic role", "Current status", "Relationship and boundary"],
  doc.portfolio.map((item) => [item.name, item.role, item.status, item.relationship]),
)}

### The practical outcome customers receive

${clean(doc.practicalOutcome)}

### What makes the business distinct

${clean(doc.distinction)}

### The founder's understanding of the business

${clean(doc.foundersUnderstanding)}

### Capability created

${clean(doc.capabilityCreated)}

**Place in the system:** ${clean(doc.placeInSystem)}

**What approval authorises:** ${clean(doc.approvalAuthorises)}
${
  needsMechanism && mechanism
    ? `
### How the business works

#### Customer value

${clean(mechanism.customerValue)}

#### The simplest accurate operating model

> ${clean(mechanism.operatingModel)}

${mechanism.modelState === "proposed" ? "This model is supported by the recorded sources but is not yet approved practice; it is proposed for approval as part of this document." : mechanism.modelState === "unresolved" ? "The operating model remains unresolved and is recorded here as an honest gap, not a settled claim." : ""}

#### How this relates to the full methodology

${clean(mechanism.methodologyRelation)}
`
    : ""
}
## Business Manifesto
---

> This is the declaration layer of the Business Foundation. It states what the business is prepared to stand for because of the truth and decisions established above.
${
  doc.includeSpine
    ? `
### Manifesto Spine

${(Object.keys(SPINE_LABELS) as (keyof Spine)[])
  .map((key) => `- **${SPINE_LABELS[key]}:** ${clean(manifesto.spine[key])}`)
  .join("\n")}
`
    : ""
}
### Declaration

${clean(manifesto.manifesto)}

### Governing Declarations

${manifesto.declarations.map((declaration, index) => `${index + 1}. ${clean(declaration)}`).join("\n")}

These declarations govern later expression inside the approved Foundation, evidence and claims boundaries. They are not campaign slogans and do not replace audience, offer, proof or channel judgement.

## Approval
---

> **Approval statement:** “${APPROVAL_STATEMENT}”

- **Decision:** ${approval ? (approval.response === "approve" ? "Approved" : approval.response === "revision-requested" ? "Revision requested" : "Source disputed") : "Pending client review."}
- **Approver:** ${approval ? `${clean(approval.approver.name)}, ${clean(approval.approver.role)}` : "Pending."}
- **Exact version:** Version ${version}${approval ? "" : " — approval binds to this exact text only"}.
- **Date:** ${approval ? date : "Pending decision event."}

Approval, a passed internal inheritance check and the current authorised route would permit Brand Strategy to progress. Representative-reader and independent-inheritance testing remain separate system-validation work and are not another client decision.

If a material source or approved definition changes, this version becomes stale. A new upstream version, assessment, Foundation version and approval are required. No downstream strategy or asset is changed or regenerated automatically.
`;
}

export const BF_DOCUMENT_KIND = "business-foundation";
export const BF_RECEIPT_KIND = "receipt";
export const BF_DECLARATION_KIND = "foundation-declaration-source";
