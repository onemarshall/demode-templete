import {expect,test} from 'bun:test';
import {resolveM02Model,M02_DEFAULT_SYNTHESIS_MODEL} from '../../src/lib/modules/strategy/server/model-policy';

test('M02 production keeps the strong synthesis policy while explicit development allows inexpensive verification',()=>{
 expect(resolveM02Model({})).toBe(M02_DEFAULT_SYNTHESIS_MODEL);
 expect(()=>resolveM02Model({M02_SYNTHESIS_MODEL:'inclusionai/ling-3.1-flash'})).toThrow('strong synthesis model');
 expect(()=>resolveM02Model({NODE_ENV:'production',M02_SYNTHESIS_MODEL:'inclusionai/ling-3.1-flash'})).toThrow('strong synthesis model');
 expect(resolveM02Model({MODEL_POLICY_DEV:'1',M02_SYNTHESIS_MODEL:'inclusionai/ling-3.1-flash'})).toBe('inclusionai/ling-3.1-flash');
 expect(resolveM02Model({SYNTHESIS_MODEL:'inclusionai/ling-3.1-flash'})).toBe(M02_DEFAULT_SYNTHESIS_MODEL);
});
