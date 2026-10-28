/** Only migrate the exact disposable integration database. */
import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {spawnSync} from 'node:child_process';import {readConnection,integrationState} from './local-stack';
const config=await readConnection();const env=JSON.parse(await readFile(resolve(integrationState,'runtime-env.json'),'utf8'));
if(env.BETTER_DATABASE_URL!==config.databaseUrl)throw new Error('Disposable database configurations differ');
const result=spawnSync('bun',['scripts/database/migrate.ts'],{cwd:process.cwd(),env:{...process.env,...env},stdio:'inherit'});process.exit(result.status??1);
