import {metadata,schemaTask} from '@trigger.dev/sdk';
import {getStrategyWorkerRuntime} from '../lib/app/strategy-worker.server';
import {authStrategyM01SessionV1PayloadSchema,runAuthStrategyM01SessionV1} from './strategy-task-handlers';
export const authStrategyM01SessionV1=schemaTask({
 id:'auth-strategy-m01-session-v1',schema:authStrategyM01SessionV1PayloadSchema,maxDuration:1200,
 retry:{maxAttempts:10,minTimeoutInMs:5000,maxTimeoutInMs:120000,factor:2,randomize:true},
 run:async input=>{metadata.set('schemaVersion',1);const result=await runAuthStrategyM01SessionV1(input,await getStrategyWorkerRuntime());metadata.set('status',result.status);return result;},
});
