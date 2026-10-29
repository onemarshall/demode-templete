import {createM01Service,type M01Ports} from '../stages/m01/service';
import {m01CommandSchema} from '../stages/m01/commands';
import {createStrategyJobRunner,type StrategyJobRunnerPorts} from './runner';
import type {StrategyRepository} from '../data/repository';
import {hasStrategyMethodRelease,loadStrategyMethod} from '../resources';

/** Stage-specific execution over the shared scoped SQL lease/publication runner. */
export function createM01Worker(ports:Omit<StrategyJobRunnerPorts,'execute'> & {repository:StrategyRepository;model?:M01Ports['model']}) {
 const runner=createStrategyJobRunner({...ports,execute:async(scope,job,lease,beforePublish)=>{
  if(!hasStrategyMethodRelease(job.methodRelease))throw new Error('Persisted M01 method release unavailable');
  loadStrategyMethod('01-Founder-Convictions/01-Prompt.md',job.methodRelease);
  const {module,stage,...raw}=job.command;if(module!=='m01'||stage!=='m01')throw new Error('Wrong M01 command binding');
  const input=m01CommandSchema.parse(raw);const model=ports.model;if(!model)throw new Error('M01 provider unavailable');
  const service=createM01Service({repository:ports.repository,methodRelease:job.methodRelease,validateSourceAuthority:async()=>{throw new Error('Background work cannot attest or seal conviction sources')},model:{
   name:model.name,
   call:async(...args)=>{const value=await model.call(...args);await beforePublish();return value},
   chat:async(messages)=>{const value=await model.chat(messages);await beforePublish();return value},
  }});
  const command={...input,jobLease:lease};
  switch(input.action){
   case'prepare':return service.prepare(scope,{...command,...input});
   case'turn':return service.turn(scope,{...command,...input});
   case'synthesise':return service.synthesise(scope,{...command,...input});
   case'revise-anchor':return service.reviseAnchor(scope,{...command,...input});
   case'revise-manifesto':return service.reviseManifesto(scope,{...command,...input});
   case'revise-matrix':return service.reviseMatrix(scope,{...command,...input});
   case'derive':return service.derive(scope,{...command,...input});
   default:throw new Error('M01 worker accepts generation commands only');
  }
 }});
 return {async run(jobId:string){if(await ports.jobs.moduleForJob(jobId)!=='m01')throw new Error('Job belongs to a different Strategy worker');return runner.run(jobId)}};
}
