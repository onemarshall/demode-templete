/** Metadata and a read-only identity in the disposable local Directus only. */
import {readConnection,waitForDirectus,docker,integrationState} from './local-stack';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function setupDirectus() {
 const config=await readConnection();
 docker(['restart',config.directusContainer]);await waitForDirectus(config.directusUrl);
 async function request(path:string,method='GET',body?:unknown) {
  const response=await fetch(config.directusUrl+path,{method,headers:{authorization:`Bearer ${config.adminToken}`,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json() as {data?:any;errors?:unknown};
  if(!response.ok)throw new Error(`Local Directus metadata request failed: ${method} ${path.split('?')[0]} (${response.status}): ${JSON.stringify((result.errors as {message?:string;extensions?:{code?:string}}[]|undefined)?.map(e=>({message:e.message,code:e.extensions?.code})))}`);
  return result.data;
 }
 for(const collection of ['strategy_engagement','strategy_session','strategy_version','strategy_document']) {
  await request(`/collections/${collection}`);
  await request(`/collections/${collection}`,'PATCH',{meta:{hidden:false,icon:'description',note:'Strategy-owned records. Application permissions and immutable SQL history remain authoritative.',accountability:'all',display_template:collection==='strategy_document'?'{{kind}}':'{{id}}'}});
  const fields=await request(`/fields/${collection}`);
  for(const field of fields)await request(`/fields/${collection}/${field.field}`,'PATCH',{meta:{readonly:true,hidden:['record_id','payload_text','canonical_payload'].includes(field.field)}});
 }
 async function find(collection:string,name:string){return (await request(`/${collection}?filter=${encodeURIComponent(JSON.stringify({name:{_eq:name}}))}&limit=1`))[0];}
 const policy=await find('policies','Strategy integration reader')??await request('/policies','POST',{name:'Strategy integration reader',admin_access:false,app_access:false});
 for(const collection of ['strategy_document','strategy_version']) {
  const filter=encodeURIComponent(JSON.stringify({_and:[{policy:{_eq:policy.id}},{collection:{_eq:collection}},{action:{_eq:'read'}}]}));
  const prior=await request(`/permissions?filter=${filter}&limit=1`);
  if(!prior.length)await request('/permissions','POST',{policy:policy.id,collection,action:'read',permissions:null,fields:['*']});
 }
 const role=await find('roles','Strategy integration reader')??await request('/roles','POST',{name:'Strategy integration reader',description:'Read-only service identity for local Strategy integration',policies:[{policy:policy.id}]});
 const email='strategy-reader@example.com';
 const prior=await request(`/users?filter=${encodeURIComponent(JSON.stringify({email:{_eq:email}}))}&fields=id&limit=1`);
 const user=prior[0]?await request(`/users/${prior[0].id}`,'PATCH',{role:role.id,status:'active',token:config.readerToken}):await request('/users','POST',{email,role:role.id,status:'active',token:config.readerToken});
 await writeFile(resolve(integrationState,'directus-metadata.json'),JSON.stringify({policyId:policy.id,roleId:role.id,readerId:user.id}),{mode:0o600});
 const readable=await fetch(config.directusUrl+'/items/strategy_document?limit=1',{headers:{authorization:`Bearer ${config.readerToken}`}});
 if(!readable.ok)throw new Error(`Local Directus reader failed (${readable.status})`);
 console.log('Local Directus exposes Strategy records through a dedicated read-only identity.');
}
if(import.meta.main)await setupDirectus();
