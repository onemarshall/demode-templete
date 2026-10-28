/** Production artifact check using synthetic private settings in the clean test copy. */
import {readFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {readConnection,integrationState} from './local-stack';
await readConnection();
let hasActiveEnv=false;try{await access(resolve('.env'));hasActiveEnv=true}catch{}
if(hasActiveEnv)throw new Error('Build Strategy verification in the isolated copy without an active .env file');
const synthetic=JSON.parse(await readFile(join(integrationState,'runtime-env.json'),'utf8'));
const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,...synthetic,
 NODE_ENV:'production',STRATEGY_ENABLED:'false',STRATEGY_INTEGRATION_TEST_MODE:'false',WRANGLER_SEND_METRICS:'false'};
const child=spawn('bun',['run','build'],{cwd:process.cwd(),env,stdio:'inherit'});
const code=await new Promise<number>((resolve,reject)=>{child.once('exit',code=>resolve(code??1));child.once('error',reject)});
process.exitCode=code;
