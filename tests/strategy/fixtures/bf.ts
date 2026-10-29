import { createHash, randomUUID } from "node:crypto";
import { BF_SOURCE_SLOT } from "../../../src/lib/modules/strategy/server/stages/bf/source";
import type { SourceRecord } from "../../../src/lib/modules/strategy/server/data/repository";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const hex = (seed: string) => sha(seed);

export const DECLARATIONS = [
  "We publish the evidence behind every quality claim.",
  "We refuse paid placement in comparison content.",
  "We report outcomes every quarter whether or not they flatter us.",
];

export const SPINE = {
  see: "Buyers cannot inspect the proof behind a claim.",
  reject: "We reject feature counts as evidence of quality.",
  believe: "Inspectable proof changes buying decisions.",
  protect: "We protect the buyer's ability to verify.",
  choose: "We choose evidence over breadth.",
  intendToChange: "We intend to make proof a buying criterion.",
  commitTo: "We commit to publishing outcomes every quarter.",
  becomesPossible: "Buyers can compare evidence instead of promises.",
};

export function bfSource(overrides: Record<string, unknown> = {}): SourceRecord {
  const decisionOwner = { name: "Synthetic Owner", authorityBasis: "synthetic-authority-1" };
  const body = {
    folder: "synthetic-brand",
    entry: {
      receipt: {
        decisionOwner,
        route: { route: "full" },
      },
    },
    m04: {
      sessionId: "66666666-6666-4666-8666-666666666666",
      sealVersionId: "77777777-7777-4777-8777-777777777777",
      sealHash: hex("m04-seal"),
      sealedAt: "2026-10-29T12:00:00.000Z",
      routeAuthorization: {
        decision_state: "authorised",
        authorised_capability: "full-standard",
        generation_permission: "brand-strategy",
        expiry: "2027-10-29T12:00:00.000Z",
      },
      sources: {
        entry: { receipt: { decisionOwner, route: { route: "full" } } },
        m01: { sessionId: "11111111-1111-4111-8111-111111111111", outputs: { coreBelief: "Visible proof changes buying decisions." } },
        m02: { sessionId: "22222222-2222-4222-8222-222222222222", recon: { market: "UK repair", geography: "UK" } },
        m03: { session: { sessionId: "33333333-3333-4333-8333-333333333333" } },
      },
      data: {
        context: {
          businessForm: "Service business",
          currentOffer: "Repair services",
          buyer: "Operations leads",
          user: "Technicians",
          trigger: "A failed repair",
          delivery: "On site",
        },
        recommendation: {
          customerReceives: "A repair that holds",
          practicalOutcome: "Fewer repeat failures",
          distinction: "Inspectable proof",
        },
      },
    },
    ...overrides,
  };
  return { id: randomUUID(), slot: BF_SOURCE_SLOT, body, hash: sha(JSON.stringify(body)) };
}

export function bfAssessment() {
  return {
    rows: [
      "factual-identity",
      "business-form",
      "current-offers",
      "payer-user",
      "buying-trigger",
      "customer-receipt",
      "delivery",
      "commercial-model",
      "market-geography",
      "practical-outcome",
      "distinction",
      "founder-belief",
      "evidence-for-claims",
      "offer-states",
      "operating-mechanism",
      "unknowns",
    ].map((id) => ({
      id,
      state: "sufficient" as const,
      basis: "observed-fact" as const,
      evidence: `Synthetic evidence for ${id}.`,
      owner: "Synthetic owner",
      nextAction: "",
      capabilityBlocked: "",
    })),
    contradictions: [],
    decision: {
      state: "passed" as const,
      reason: "Synthetic assessment passed.",
      questions: [],
      returnOwners: [],
      manifestoRoute: "permitted" as const,
    },
    assessedBy: "Synthetic assessor",
  };
}

export function bfManifesto() {
  const convictions = [
    { statement: "Proof must be inspectable.", evidence: "Synthetic evidence one.", consequence: "Every claim carries a source." },
    { statement: "Buyers decide on evidence.", evidence: "Synthetic evidence two.", consequence: "We publish outcomes." },
    { statement: "Refusal is part of the position.", evidence: "Synthetic evidence three.", consequence: "We refuse paid placement." },
  ];
  const manifesto = `We see buyers who cannot inspect the proof behind a claim. We believe inspectable proof changes buying decisions. ${DECLARATIONS.join(" ")} We commit to publishing outcomes every quarter and we refuse to buy attention.`;
  const sourceTrace = [
    ...convictions.map((conviction) => ({ item: conviction.statement, sourceRef: "Synthetic conviction source" })),
    ...Object.values(SPINE).map((statement) => ({ item: statement, sourceRef: "Synthetic spine source" })),
    ...DECLARATIONS.map((declaration) => ({ item: declaration, sourceRef: "Synthetic declaration source" })),
  ];
  return {
    convictions,
    spine: SPINE,
    manifesto,
    declarations: DECLARATIONS,
    implications: [
      { id: "imp-1", implication: "Publish a quarterly outcome register.", disposition: "reflected" as const, target: "" },
    ],
    sourceTrace,
    declarationTests: [
      "derivation",
      "no-invention",
      "line-in-the-sand",
      "stakes",
      "specificity",
      "courage",
      "spoken",
      "claims",
      "role-boundary",
      "coherence",
      "foundation-implications",
    ].map((id) => ({ id, result: "pass" as const, basis: "Synthetic human assessment." })),
  };
}

const SECTIONS = [
  "executive-overview",
  "what-the-business-is",
  "why-it-exists",
  "who-it-serves",
  "what-it-produces",
  "products-services",
  "portfolio",
  "practical-outcome",
  "distinction",
  "founders-understanding",
  "capability-created",
  "manifesto",
  "approval",
];

export function bfDocument() {
  return {
    business: "Synthetic Repair Co",
    purposeText: "This document records what the business is and where it stands.",
    plainTerms: "A repair business that publishes its evidence.",
    atAGlance: {
      form: "Service",
      buyNow: "Repair services",
      payer: "Operations leads",
      user: "Technicians",
      trigger: "A failed repair",
      receives: "A repair that holds",
      delivery: "On site",
      operates: "UK",
    },
    whatTheBusinessIs: "A repair business.",
    whyItExists: "Because buyers cannot inspect proof.",
    whoItServes: "Operations leads and technicians.",
    whatItProduces: "Repairs and published evidence.",
    productsServices: [
      { name: "Repair service", what: "On-site repair", whoFor: "Operations leads", state: "current" as const },
    ],
    scope: "whole-business" as const,
    portfolio: [
      { name: "Repair service", role: "Core offer", status: "Current", relationship: "Primary revenue" },
    ],
    practicalOutcome: "Fewer repeat failures.",
    distinction: "Inspectable proof.",
    foundersUnderstanding: "The founder believes proof must be visible in use.",
    capabilityCreated: "A published outcome register.",
    placeInSystem: "The definition later brand work inherits.",
    approvalAuthorises: "Brand Strategy to progress within the approved route.",
    offerForm: "service" as const,
    explanatoryDependency: "not-required" as const,
    operatingMechanism: null,
    includeSpine: true,
    sectionLineage: SECTIONS.map((section) => ({
      section,
      sources: ["Synthetic source"],
      basis: "Observed fact",
      limitation: "",
    })),
    structuralTests: [
      "category",
      "transaction",
      "customer",
      "outcome",
      "delivery",
      "specificity",
      "consistency",
      "distinction",
      "evidence",
      "portfolio",
    ].map((id) => ({ id, result: "pass" as const, basis: "Synthetic human assessment." })),
    distillation: {
      loadBearingMinimum: "A repair business that publishes evidence.",
      hostileReading: "A repair business with a marketing habit.",
      variablesPreserved: ["offer", "buyer", "outcome"],
    },
  };
}
