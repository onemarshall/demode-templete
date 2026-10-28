/** Disposable local PostgreSQL + Directus. Never consumes application .env files. */
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,chmod,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
export const integrationState=resolve('.local-state/strategy-integration');
export const connectionFile=resolve(integrationState,'connection.json');
export interface IntegrationConnection {
 databaseUrl:string;directusUrl:string;adminToken:string;readerToken:string;
 adminEmail:string;adminPassword:string;project:string;composeFile:string;
 directusContainer:string;databaseContainer:string;
}
export async function readConnection():Promise<IntegrationConnection> {
 const config=JSON.parse(await readFile(connectionFile,'utf8')) as IntegrationConnection;
 const db=new URL(config.databaseUrl),api=new URL(config.directusUrl);
 if(db.hostname!=='127.0.0.1'||db.port!=='55433'||db.pathname!=='/strategy_auth_integration_test'||api.origin!=='http://127.0.0.1:8112'||config.project!=='strategy-auth-integration')throw new Error('Only the isolated local Strategy integration stack is permitted');
 return config;
}
export function docker(args:string[]) {
 const result=spawnSync('docker',args,{encoding:'utf8'});
 if(result.status!==0)throw new Error(`Local Docker operation failed: ${result.stderr.slice(0,1000)}`);
 return result.stdout;
}
export async function waitForDirectus(url:string) {
 for(let attempt=0;attempt<90;attempt++){
  try {const response=await fetch(`${url}/server/ping`,{signal:AbortSignal.timeout(1500)});if(response.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw new Error('Isolated Directus did not become healthy');
}
export async function startLocalStack() {
 await mkdir(integrationState,{recursive:true,mode:0o700});await chmod(integrationState,0o700);
 let config:IntegrationConnection;
 try {config=await readConnection();}catch(error){
  if(!(error instanceof Error&&'code' in error&&error.code==='ENOENT'))throw error;
  const secret=()=>randomBytes(32).toString('hex');const password=secret();
  config={databaseUrl:`postgresql://strategy_integration:${password}@127.0.0.1:55433/strategy_auth_integration_test`,directusUrl:'http://127.0.0.1:8112',adminEmail:'strategy-admin@example.com',adminPassword:secret(),adminToken:secret(),readerToken:secret(),project:'strategy-auth-integration',composeFile:resolve(integrationState,'compose.json'),directusContainer:'strategy-auth-integration-directus',databaseContainer:'strategy-auth-integration-postgres'};
  const databaseImage=docker(['image','inspect','--format','{{.Id}}','postgres:16']).trim();
  const directusImage=docker(['image','inspect','--format','{{.Id}}','directus/directus:12.5.0']).trim();
  const compose={name:config.project,services:{
   postgres:{image:databaseImage,pull_policy:'never',container_name:config.databaseContainer,environment:{POSTGRES_DB:'strategy_auth_integration_test',POSTGRES_USER:'strategy_integration',POSTGRES_PASSWORD:password},ports:['127.0.0.1:55433:5432'],volumes:['strategy_test_postgres:/var/lib/postgresql/data'],healthcheck:{test:['CMD-SHELL','pg_isready -U strategy_integration -d strategy_auth_integration_test'],interval:'2s',timeout:'2s',retries:30}},
   directus:{image:directusImage,pull_policy:'never',container_name:config.directusContainer,depends_on:{postgres:{condition:'service_healthy'}},environment:{SECRET:secret(),ADMIN_EMAIL:config.adminEmail,ADMIN_PASSWORD:config.adminPassword,ADMIN_TOKEN:config.adminToken,DB_CLIENT:'pg',DB_HOST:'postgres',DB_PORT:'5432',DB_DATABASE:'strategy_auth_integration_test',DB_USER:'strategy_integration',DB_PASSWORD:password,PUBLIC_URL:config.directusUrl,CACHE_ENABLED:'false',TELEMETRY:'false',WEBSOCKETS_ENABLED:'false'},ports:['127.0.0.1:8112:8055']}
  },volumes:{strategy_test_postgres:{}}};
  await writeFile(config.composeFile,JSON.stringify(compose,null,2),{mode:0o600});await chmod(config.composeFile,0o600);
  await writeFile(connectionFile,JSON.stringify(config,null,2),{mode:0o600});await chmod(connectionFile,0o600);
 }
 docker(['compose','-p',config.project,'-f',config.composeFile,'up','-d']);await waitForDirectus(config.directusUrl);
 console.log('Isolated PostgreSQL and Directus are healthy. Credentials remain in private local state.');return config;
}
export async function stopLocalStack(removeData=false) {
 const config=await readConnection();docker(['compose','-p',config.project,'-f',config.composeFile,'down',...(removeData?['--volumes']:[])]);
 if(removeData){await rm(connectionFile,{force:true});await rm(config.composeFile,{force:true});}
 console.log(removeData?'Isolated integration containers and disposable data removed.':'Isolated integration containers stopped; disposable data retained.');
}
if(import.meta.main){const action=process.argv[2]??'up';if(action==='up')await startLocalStack();else if(action==='down')await stopLocalStack(process.argv.includes('--remove-data'));else throw new Error('Use up or down [--remove-data]');}
