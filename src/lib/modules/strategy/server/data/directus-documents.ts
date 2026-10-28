import {createHash} from 'node:crypto';
import {z} from 'zod';
import {assertStrategyScope,recheckStrategyScope,type StrategyScope} from '../access';

export interface ReadableStrategyDocument {
 id:string;versionId:string;sessionId:string;kind:string;content:string;hash:string;
}
export interface StrategyDocumentReader {
 getDocument(scope:StrategyScope,id:string):Promise<ReadableStrategyDocument|null>;
}
export class StrategyDocumentServiceError extends Error {
 constructor(){super('The saved strategy document is temporarily unavailable.');}
}
const ownership=z.object({organisation_id:z.string(),brand_id:z.string(),engagement_id:z.string()});
const documentSchema=ownership.extend({id:z.string(),version_id:z.string(),kind:z.string(),content:z.string(),hash:z.string().regex(/^[a-f0-9]{64}$/)});
const versionSchema=ownership.extend({id:z.string(),session_id:z.string().min(1)});

/** Server-only read adapter. A narrow read-only Directus service identity is
 * combined with live application authority and mandatory complete tenant filters.
 * Directus user-profile synchronisation is never treated as authorisation. */
export class DirectusStrategyDocumentReader implements StrategyDocumentReader {
 private readonly base:URL;
 private readonly request:typeof fetch;
 constructor(private readonly options:{url:string;token:string;fetch?:typeof fetch}) {
  this.base=new URL(options.url.endsWith('/')?options.url:options.url+'/');
  if(!['http:','https:'].includes(this.base.protocol)||this.base.username||this.base.password||!options.token.trim())throw new StrategyDocumentServiceError();
  this.request=options.fetch??globalThis.fetch;
 }
 private async rows(scope:StrategyScope,collection:'strategy_document'|'strategy_version',id:string,fields:string[]) {
  const url=new URL(`items/${collection}`,this.base);
  url.searchParams.set('filter',JSON.stringify({_and:[{organisation_id:{_eq:scope.organisationId}},{brand_id:{_eq:scope.brandId}},{engagement_id:{_eq:scope.engagementId}},{id:{_eq:id}}]}));
  url.searchParams.set('fields',fields.join(','));url.searchParams.set('limit','2');
  try {
   const response=await this.request(url,{headers:{authorization:`Bearer ${this.options.token}`,accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10_000)});
   if(!response.ok)throw new StrategyDocumentServiceError();
   if(Number(response.headers.get('content-length')??0)>4_000_000)throw new StrategyDocumentServiceError();
   const raw=await response.text();if(raw.length>4_000_000)throw new StrategyDocumentServiceError();
   const result=z.object({data:z.array(z.unknown()).max(1)}).parse(JSON.parse(raw));
   return result.data;
  }catch {throw new StrategyDocumentServiceError();}
 }
 private owned(scope:StrategyScope,row:z.infer<typeof ownership>) {
  return row.organisation_id===scope.organisationId&&row.brand_id===scope.brandId&&row.engagement_id===scope.engagementId;
 }
 async getDocument(scope:StrategyScope,id:string):Promise<ReadableStrategyDocument|null> {
  assertStrategyScope(scope,['read','export']);await recheckStrategyScope(scope);
  if(!id.trim()||id.length>200)throw new StrategyDocumentServiceError();
  const keys=['organisation_id','brand_id','engagement_id'];
  const rows=await this.rows(scope,'strategy_document',id,[...keys,'id','version_id','kind','content','hash']);
  if(!rows.length){await recheckStrategyScope(scope);return null;}
  const parsed=documentSchema.safeParse(rows[0]);if(!parsed.success)throw new StrategyDocumentServiceError();
  const document=parsed.data;
  if(!this.owned(scope,document)||document.id!==id)throw new StrategyDocumentServiceError();
  const versions=await this.rows(scope,'strategy_version',document.version_id,[...keys,'id','session_id']);
  const checked=versionSchema.safeParse(versions[0]);if(!checked.success)throw new StrategyDocumentServiceError();
  const version=checked.data;
  if(!this.owned(scope,version)||version.id!==document.version_id||createHash('sha256').update(document.content).digest('hex')!==document.hash)throw new StrategyDocumentServiceError();
  // A permission revoked while the API request was in flight must prevent delivery.
  await recheckStrategyScope(scope);
  return {id:document.id,versionId:document.version_id,sessionId:version.session_id,kind:document.kind,content:document.content,hash:document.hash};
 }
}
