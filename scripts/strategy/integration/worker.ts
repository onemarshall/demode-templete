/** Actual task handler in a standalone Node process, with isolated integration guards. */
import {assertLocalStrategyIntegration} from '../../../src/lib/modules/strategy/server/integration-test-guard';
import {getStrategyWorkerRuntime,getStrategyRecoveryRuntime,closeStrategyWorkerRuntime} from '../../../src/lib/app/strategy-worker.server';
import {authStrategyM04SessionV2PayloadSchema,runAuthStrategyM04SessionV2,runAuthStrategyRecoveryV1} from '../../../src/trigger/strategy-task-handlers';
assertLocalStrategyIntegration();
try {
 const argument=process.argv[2];
 const output=argument==='--recover'?await runAuthStrategyRecoveryV1(await getStrategyRecoveryRuntime()):await runAuthStrategyM04SessionV2(authStrategyM04SessionV2PayloadSchema.parse({version:1,jobId:argument}),await getStrategyWorkerRuntime());
 console.log(JSON.stringify(output));
}finally{await closeStrategyWorkerRuntime();}
