/** Compile the standalone integration worker using the same source aliases as Trigger. */
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
mkdirSync('.local-state/strategy-integration',{recursive:true,mode:0o700});
const result=spawnSync('bun',['build','scripts/strategy/integration/worker.ts','--tsconfig-override','tsconfig.worker.json','--target','node',...['pg','zod','consola','markdown-it','@trigger.dev/sdk'].flatMap(name=>['--external',name]),'--outfile','.local-state/strategy-integration/worker.mjs'],{stdio:'inherit'});
process.exit(result.status??1);
