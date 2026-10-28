import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {parse} from 'dotenv';
import {integrationState,readConnection} from './local-stack';
await readConnection();
const env=JSON.parse(await readFile(resolve(integrationState,'runtime-env.json'),'utf8'));
const deliveryFlag=process.argv.indexOf('--delivery-env-file');
if(deliveryFlag!==-1){
 const file=process.argv[deliveryFlag+1];if(!file)throw new Error('Delivery environment file required');
 const delivery=parse(await readFile(resolve(file),'utf8'));
 if(!delivery.TRIGGER_SECRET_KEY?.startsWith('tr_dev_')||!delivery.TRIGGER_DEV_BRANCH||delivery.TRIGGER_DEV_BRANCH==='production')throw new Error('Only explicit development delivery is permitted');
 const endpoint=new URL(delivery.TRIGGER_API_URL??'https://api.trigger.dev');
 if(endpoint.protocol!=='https:'||!['cloud.trigger.dev','api.trigger.dev'].includes(endpoint.hostname)||endpoint.username||endpoint.password)throw new Error('Expected the existing Trigger development API');
 for(const key of ['TRIGGER_SECRET_KEY','TRIGGER_API_URL','TRIGGER_DEV_BRANCH','TRIGGER_PROJECT_REF'])if(delivery[key])env[key]=delivery[key];
}
const child=spawn('bun',['run','dev','--config','scripts/strategy/integration/vite.config.ts','--host','127.0.0.1','--port','5188','--strictPort'],{cwd:process.cwd(),env:{...process.env,...env},stdio:'inherit'});
await writeFile(resolve(integrationState,'server.pid'),String(process.pid),{mode:0o600});
process.once('SIGTERM',()=>child.kill('SIGTERM'));process.once('SIGINT',()=>child.kill('SIGTERM'));
await new Promise<void>((resolve,reject)=>{child.once('exit',()=>resolve());child.once('error',reject);});
