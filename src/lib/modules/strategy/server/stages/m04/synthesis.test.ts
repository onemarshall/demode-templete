import {describe,expect,test} from "vitest";
import {z} from 'zod';
import {draftMessages,draftResponseSchema} from './synthesis';
import {STAGE_SCHEMAS,type M04Session} from './contracts';
import {createM04Providers} from '../../providers/m04';
import {CALCULATION_DESCRIPTIONS} from './calculations';
import {systemPrompt} from './chat';
const session={sources:{entry:{receipt:{decisionOwner:{name:'Synthetic owner',authorityBasis:'Synthetic approved receipt'}}}},data:{},drafts:{}} as unknown as M04Session;
function arrayItemSchema(schema: unknown, property: string): Parameters<typeof z.fromJSONSchema>[0] {
  if (typeof schema !== 'object' || schema === null) throw new Error('Expected an object JSON schema');
  const properties = (schema as Record<string, unknown>).properties;
  if (typeof properties !== 'object' || properties === null) throw new Error('Expected JSON schema properties');
  const field = (properties as Record<string, unknown>)[property];
  if (typeof field !== 'object' || field === null) throw new Error(`Expected ${property} field schema`);
  const items = (field as Record<string, unknown>).items;
  if (typeof items !== 'object' || items === null) throw new Error(`Expected ${property} array item schema`);
  return items as Parameters<typeof z.fromJSONSchema>[0];
}
describe('M04 source-bound draft identity',()=>{
 test('constrains identity to the pinned receipt in both schema and prompt',()=>{
  const schema=draftResponseSchema(session,'context');
  expect(schema.properties?.decisionOwner).toMatchObject({type:'string',const:'Synthetic owner'});
  expect(schema.properties?.authorityRef).toMatchObject({type:'string',const:'Synthetic approved receipt'});
  const prompt=JSON.parse(draftMessages(session,'context','Synthetic method')[1].content);
  expect(prompt.schema).toEqual(JSON.parse(JSON.stringify(schema)));
  expect(STAGE_SCHEMAS.context.shape.decisionOwner.safeParse('A different name').success).toBe(true);
 });
 test('fails before a provider call when pinned authority is unavailable',async()=>{
  let called=false;const provider=createM04Providers({apiKey:'synthetic',fetch:async()=>{called=true;throw new Error('Unexpected request')}});
  await expect(provider.generate!({session:{...session,sources:{}},stage:'context',method:'Synthetic method'})).rejects.toThrow('Pinned engagement authority');
  expect(called).toBe(false);
 });
 test('constrains financial inputs to the typed economic record, including explicit unknowns',()=>{
  const schema=draftResponseSchema(session,'financial-grounding');
  const input=z.fromJSONSchema(arrayItemSchema(schema,'inputs'));
  const unknown={input_id:'cash-reserve',name:'Available cash',unit:'GBP',period:'current',currency:'GBP',source_id:'source-1',source_ref:'receipt-1',source_date:'2026-10-13',owner:'Founder',confidence:'unverified',calculation_use:'Review only',derivation:'Not yet established',review_trigger:'When records arrive',strategic_version:'v1',input_type:'unknown',value_or_range:null};
  expect(input.safeParse(unknown).success).toBe(true);
  expect(input.safeParse({...unknown,value_or_range:0}).success).toBe(false);
  expect(input.safeParse({...unknown,source_ref:''}).success).toBe(false);
  expect(input.safeParse({...unknown,unrelatedFact:'non-economic context'}).success).toBe(false);
 });
 test('structurally permits only supported calculation kinds and their exact formulas',()=>{
  const schema=draftResponseSchema(session,'financial-grounding');
  const calculation=z.fromJSONSchema(arrayItemSchema(schema,'calculations'));
  const supported={id:'calc-1',kind:'sum',inputIds:['a'],assumptions:'Only compatible inputs',formula:CALCULATION_DESCRIPTIONS.sum.formula};
  expect(calculation.safeParse(supported).success).toBe(true);
  expect(calculation.safeParse({...supported,kind:'invented'}).success).toBe(false);
  expect(calculation.safeParse({...supported,formula:'a + b'}).success).toBe(false);
 });
 test('requires generated M10 consolidation while preserving unresolved M1–M9 drafts',()=>{
  const schema=draftResponseSchema(session,'financial-grounding');
  const mechanism=z.fromJSONSchema(arrayItemSchema(schema,'mechanisms'));
  const common={reason:'Needs review',finding:'Not yet established',inputIds:[],limitation:'Carry as unresolved'};
  expect(mechanism.safeParse({id:'M1',applicable:false,disposition:'unresolved',...common}).success).toBe(true);
  expect(mechanism.safeParse({id:'M10',applicable:true,disposition:'applicable',...common}).success).toBe(true);
  expect(mechanism.safeParse({id:'M10',applicable:false,disposition:'unresolved',...common}).success).toBe(false);
  expect(mechanism.safeParse({id:'M10',applicable:true,...common}).success).toBe(false);
 });
 test('keeps non-financial stage schemas unchanged',()=>{
  expect(JSON.stringify(draftResponseSchema(session,'market-readiness'))).toBe(JSON.stringify(z.toJSONSchema(STAGE_SCHEMAS['market-readiness'])));
 });
 test('adds concise recommendation guidance without changing its schema or authority boundary',()=>{
  const method='Complete canonical method stays here, including every governing test and requirement.';
  const [system,user]=draftMessages(session,'recommendation',method);
  const prompt=system.content;
  expect(prompt).toContain(method);
  expect(prompt).toContain('Aim for no more than 6000 output tokens');
  expect(prompt).toContain('generally keep each text field to 40 words or fewer');
  expect(prompt).toContain('Assess the routes meaningfully against the actual evidence');
  expect(prompt).toContain('minimum material meaning and accountability');
  expect(prompt).toContain('Preserve unknowns, limitations, dissent and low confidence explicitly');
  expect(prompt).toContain('Do not fabricate a human confirmation');
  expect(prompt).toContain('Do not create a human confirmation, decision, approval or route authority');
  expect(prompt).toContain('unconfirmed candidate for human review');
  expect(JSON.parse(user.content)).toMatchObject({sourceBundle:session.sources,confirmedFindings:session.data});
  expect(JSON.stringify(draftResponseSchema(session,'recommendation'))).toBe(JSON.stringify(z.toJSONSchema(STAGE_SCHEMAS.recommendation)));
  expect(draftMessages(session,'market-readiness',method)[0].content).not.toContain('6000 output tokens');
 });
 test('chat prompt uses the same typed financial record schema without forcing completion',()=>{
  const prompt=systemPrompt(session,'financial-grounding');
  expect(prompt).toContain('input_type=unknown and value_or_range=null');
  expect(prompt).toContain('empty calculations array when no actual calculation is supported');
  expect(prompt).toContain('const');
  expect(prompt).toContain('"M10"');
  expect(prompt).toContain('"complete": boolean');
 });
 test('never requests a model-generated human decision',async()=>{
  let called=false;const provider=createM04Providers({apiKey:'synthetic',fetch:async()=>{called=true;throw new Error('Unexpected request')}});
  await expect(provider.generate!({session,stage:'human-decision',method:'Synthetic method'})).rejects.toThrow('authorised human');
  expect(called).toBe(false);
 });
});
