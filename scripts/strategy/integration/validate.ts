/** Build with explicit isolated test configuration; never loads a live .env. */
import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {spawnSync} from 'node:child_process';import {readConnection,integrationState} from './local-stack';
await readConnection();const env=JSON.parse(await readFile(resolve(integrationState,'runtime-env.json'),'utf8'));
const result=spawnSync('bun',['run','build'],{cwd:process.cwd(),env:{...process.env,...env,STRATEGY_ENABLED:'false',STRATEGY_INTEGRATION_TEST_MODE:'false'},stdio:'inherit'});process.exit(result.status??1);
