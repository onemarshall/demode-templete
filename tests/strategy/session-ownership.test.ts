import {test,expect} from 'bun:test';
import {createStrategyAccess} from '../../src/lib/modules/strategy/server/access';
import {StrategyNotFound,type StrategyRepository} from '../../src/lib/modules/strategy/server/data/repository';
import {createM04Service} from '../../src/lib/modules/strategy/server/stages/m04/service';
test('an otherwise permitted brand cannot reveal a session owned by another brand',async()=>{
 const scope=await createStrategyAccess(async r=>({actorId:'user',organisationId:r.organisationId,brandId:r.brandId,activeMembership:true,activeBrandAssignment:true,actions:['read']})).authorize({organisationId:'org',brandId:'brand-b',engagementId:'engagement',action:'read'});
 const service=createM04Service({repository:{getSession:async()=>null} as unknown as StrategyRepository,actor:async()=>({name:'Synthetic',role:'viewer',authorityRef:'fixture'})});
 await expect(service.load(scope,'other-brand-session')).rejects.toBeInstanceOf(StrategyNotFound);
});
