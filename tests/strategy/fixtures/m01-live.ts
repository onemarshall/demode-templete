import type { M01Input } from '../../../src/lib/modules/strategy/server/stages/m01/session';

/** Invented scenario for controlled M01 provider integration. No actual founder or client. */
export const fictionalFounderSource: M01Input = {
  eligible: true,
  folder: 'synthetic-fictional-founder',
  engagement: 'new business',
  entry: { approved: true, source: 'fictional integration fixture', synthetic: true },
  parts: [{
    file: 'fictional-founder-notes.md',
    text: `SYNTHETIC FICTION — every person, event, number and business in this material is invented for a controlled software integration test. It is not testimony, customer evidence or a claim about a real company.

The fictional founder is Mara Vale, who is imagining a small consultancy for independent repair shops. In the story, she spent eight years coordinating repairs at a made-up regional workshop. She noticed that customers were often told a repair was delayed only after the promised collection date had passed. The mechanics were not lazy; the front desk had no reliable way to see which parts had arrived or which jobs were blocked.

Mara's fictional turning point came when she promised a customer a Friday collection without checking the supplier status. The part arrived late, the customer rearranged work twice, and Mara had to explain the mistake herself. She says the embarrassment mattered more than the refund. She began a paper board that named the next action, its owner and the time the customer should hear from them again.

The imagined practice she wants to build helps small teams make a clear promise only when they can explain what is known, what is uncertain and who will update the customer. She would refuse to hide a delay behind vague phrases such as “nearly ready”. She believes a difficult update given early is more respectful than reassurance that cannot be kept. The fictional story does not establish market demand, customer outcomes, financial results or a proven product. Those remain untested hypotheses in this synthetic exercise.`,
  }],
};

export const fictionalFounderAnswer = `For this fictional scenario, the moment I keep returning to is the Friday promise. I said the repair would be ready before I had checked whether the part had arrived. The customer moved work around twice, and I had to own that I had reassured them because I wanted the conversation to be easy. The paper board changed how I worked: every blocked job had a next action, a person responsible and a time to update the customer. I do not want a business that makes uncertainty sound like certainty. If we do not know, we say what we are checking and when we will come back. This is invented material for a software test; it does not describe a real founder or a real customer.`;

/** One final fictional founder contribution to satisfy M01's four-segment synthesis minimum. */
export const fictionalFounderClosing = `One last point in this invented scenario: this is not an earlier pre-session, and I am describing a fictional belief in Mara's voice. We have no real market proof here, and nothing in this exercise reports evidence from an actual founder or customer.`;

export const M01_LIVE_OPERATIONS = [
  'prepare',
  'turn-null',
  'turn-rich',
  'synthesise',
  'revise-anchor',
  'revise-manifesto',
  'revise-matrix',
  'derive',
] as const;
