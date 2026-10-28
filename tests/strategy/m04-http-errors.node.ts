import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strategyHttpError} from '../../src/lib/app/strategy-host.server';
import {M04ReviewRequiredError} from '../../src/lib/modules/strategy/server/stages/m04/workflow';
test('authorised stage reviewers get the domain rule without infrastructure details',async()=>{
 const response=strategyHttpError(new M04ReviewRequiredError('Decision owner must match the exact approved Engagement authority.'));
 assert.equal(response.status,400);
 assert.deepEqual(await response.json(),{code:'stage-review-required',error:'Decision owner must match the exact approved Engagement authority.'});
 const infrastructure=strategyHttpError(new Error('private database password or upstream body'));
 assert.ok(!JSON.stringify(await infrastructure.json()).includes('private database'));
});
