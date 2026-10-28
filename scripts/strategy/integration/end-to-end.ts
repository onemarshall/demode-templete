/** Actual Auth HTTP + separate worker + PostgreSQL + Directus local integration. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {request,chromium} from '@playwright/test';
import {readConnection,integrationState} from './local-stack';
import {StrategyRepository} from '../../../src/lib/modules/strategy/server/data/repository';
import {createStrategyAccess} from '../../../src/lib/modules/strategy/server/access';
import {hashM04} from '../../../src/lib/modules/strategy/server/stages/m04/session';
const config=await readConnection(),read=async(name:string)=>JSON.parse(await readFile(resolve(integrationState,name),'utf8'));
const fixture=await read('fixture.json'),test=await read('test.json'),source=await read('source.json');
const pool=new Pool({connectionString:config.databaseUrl});
const api=await request.newContext({baseURL:test.appUrl,extraHTTPHeaders:{origin:test.appUrl}});
let assertions=0;const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);assertions++};
const sendAuth=async(path:string,data:unknown)=>api.post(`/api/auth/${path}`,{data});
try {
 for(let attempt=0;attempt<60;attempt++){try{if((await api.get('/api/auth/get-session',{timeout:10000})).ok())break;}catch{}if(attempt===59)throw new Error('Isolated Auth server did not become ready');await new Promise(r=>setTimeout(r,1000));}
 let user=(await pool.query('SELECT id FROM "user" WHERE email=$1',[test.email])).rows[0];
 if(!user){const signup=await sendAuth('sign-up/email',{email:test.email,password:test.password,name:test.actor.name});check(signup.ok(),`Sign-up failed: ${signup.status()}`);user=(await pool.query('SELECT id FROM "user" WHERE email=$1',[test.email])).rows[0];}
 check(user,'Real Auth user persisted');
 // Mock email delivery is outside this integration; mark only this fresh synthetic identity verified.
 await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1 AND email=$2',[user.id,test.email]);
 const signin=await sendAuth('sign-in/email',{email:test.email,password:test.password});check(signin.ok(),`Real sign-in failed: ${signin.status()}`);
 const updated=await sendAuth('update-user',{name:test.actor.name});check(updated.ok(),'Auth update triggers profile synchronization');
 const synced=await pool.query('SELECT count(*)::int AS count FROM directus_users WHERE email=$1',[test.email]);check(synced.rows[0].count===1,'Synthetic Auth profile synchronized to Directus');
 const current=await api.get('/api/auth/get-session');check((await current.json()).user.id===user.id,'Real session cookie resolves the user');
 const suffix=test.grantId.slice(0,8),org=`strategy-org-${suffix}`,brand=`strategy-brand-${suffix}`,slug=`strategy-${suffix}`;
 await pool.query('INSERT INTO organization(id,name,slug,"createdAt") VALUES($1,$2,$3,now()) ON CONFLICT DO NOTHING',[org,'Synthetic integration organisation',slug]);
 await pool.query('INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now()) ON CONFLICT DO NOTHING',[`strategy-member-${suffix}`,org,user.id,'owner']);
 await pool.query('INSERT INTO personal_organisation_owner(organisation_id,owner_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[org,user.id]);
 await pool.query('INSERT INTO brand(id,organisation_id,name,slug,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[brand,org,'Synthetic integration brand','synthetic',user.id]);
 await pool.query("INSERT INTO brand_member(id,brand_id,user_id,role,status,grant_source,granted_by) VALUES($1,$2,$3,'brand_admin','active','administrative',$3) ON CONFLICT DO NOTHING",[`strategy-assignment-${suffix}`,brand,user.id]);
 await pool.query('INSERT INTO creem_subscription(id,"productId","referenceId",status,"periodEnd") VALUES($1,$2,$3,$4,now()+interval \'1 day\') ON CONFLICT DO NOTHING',[`strategy-subscription-${suffix}`,'synthetic-test-only',user.id,'active']);
 await pool.query('UPDATE creem_subscription SET status=$2,"periodEnd"=now()+interval \'1 day\' WHERE "referenceId"=$1',[user.id,'active']);
 await pool.query('INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[org,brand]);
 await pool.query('INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[org,brand,test.engagementId,'Synthetic integration engagement',user.id]);
 await pool.query("INSERT INTO strategy_access_grant(id,organisation_id,brand_id,engagement_id,user_id,actions,is_approver,authority_role) VALUES($1,$2,$3,$4,$5,ARRAY['read','edit','approve','generate','export','manage'],true,$6) ON CONFLICT(id) DO UPDATE SET revoked_at=NULL",[test.grantId,org,brand,test.engagementId,user.id,test.actor.role]);
 // Trusted fixture setup only. Every HTTP command below uses live Auth authority.
 const access=createStrategyAccess(async r=>({actorId:user.id,organisationId:r.organisationId,brandId:r.brandId,activeMembership:true,activeBrandAssignment:true,actions:['manage'],approvalEngagementId:r.engagementId}));
 const scope=await access.authorize({organisationId:org,brandId:brand,engagementId:test.engagementId,action:'manage'});
 const repo=new StrategyRepository(pool);await repo.setSource(scope,{id:randomUUID(),slot:'m04-chain',body:source,hash:hashM04(source)});
 const base=`/o/${slug}/synthetic/strategy/engagements/${test.engagementId}/viability-check`;
 const anonymous=await request.newContext({baseURL:test.appUrl});check((await anonymous.get(base,{headers:{accept:'application/json'}})).status()===403,'Anonymous cannot read Strategy');await anonymous.dispose();
 const post=async(data:unknown)=>{const response=await api.post(base,{data});const body=await response.json();check(response.ok(),`Strategy command failed ${response.status()}: ${JSON.stringify(body)}`);return body};
 let record=await post({action:'create',commandId:randomUUID()});
 const command=(action:string,extra:Record<string,unknown>={})=>({action,sessionId:record.id,expectedRevision:record.revision,commandId:randomUUID(),...extra});
 const pending=await post(command('draft',{stage:'context'}));check(pending.jobId,'Draft committed a durable job');
 let job;for(let attempt=0;attempt<90;attempt++){job=await (await api.get(`${base}?sessionId=${record.id}&jobId=${pending.jobId}`,{headers:{accept:'application/json'}})).json();if(job.status==='succeeded'||job.status==='failed')break;await new Promise(r=>setTimeout(r,500));}
 check(job?.status==='succeeded',`Separate worker did not succeed: ${JSON.stringify(job)}`);
 let loaded=await (await api.get(`${base}?sessionId=${record.id}`,{headers:{accept:'application/json'}})).json();record={id:loaded.session.sessionId,revision:loaded.session.revision,payload:loaded.session};
 const stale=await api.post(base,{data:command('save',{stage:'context',payload:{},expectedRevision:record.revision-1})});check(stale.status()===409,'Stale revisions rejected');
 for(const stage of ['context','conviction-cost','market-readiness','human-load','financial-grounding','awareness-and-weighing','recommendation'])record=await post(command('confirm',{stage,payload:fixture.candidates[stage]}));
 record=await post(command('present'));

 record=await post(command('decide',{payload:pilotDecision(record.payload)}));record=await post(command('seal'));
 const response=await api.get(`${base}?sessionId=${record.id}`,{headers:{accept:'application/json'}});check(response.ok(),'Sealed record reads through Directus');loaded=await response.json();
 const document=loaded.documents.find((d:any)=>d.kind==='viability-check');check(document?.contentHtml?.includes('<h'),'Saved document rendered');
 const stored=(await pool.query('SELECT content,hash FROM strategy_document WHERE id=$1',[document.id])).rows[0];check(stored.content===document.content,'Directus content equals persisted content');check(createHash('sha256').update(stored.content).digest('hex')===stored.hash,'Persisted content hash preserved');
 const handoff=`${base}/handoff?sessionId=${record.id}&versionId=${document.versionId}&documentId=${document.id}`;
 const download=await api.get(handoff);check(download.ok()&&await download.text()===stored.content,'Markdown download equals immutable database version');
 const direct=await fetch(`${config.directusUrl}/items/strategy_document?filter[id][_eq]=${document.id}`,{headers:{authorization:`Bearer ${config.readerToken}`}});check(direct.ok,'Actual Directus API reads saved record');
 const forbidden=await fetch(`${config.directusUrl}/items/strategy_document/${document.record_id??document.id}`,{method:'PATCH',headers:{authorization:`Bearer ${config.readerToken}`,'content-type':'application/json'},body:JSON.stringify({content:'forged'})});check(forbidden.status===403,'Directus service identity cannot write');
 const cross=await api.get(base.replace('/synthetic/','/not-assigned-synthetic/')+`?sessionId=${record.id}`,{headers:{accept:'application/json'}});check(cross.status()===403,'Cross-brand route denied');
 let immutable=false;try{await pool.query('UPDATE strategy_document SET content=$1 WHERE id=$2',['forged',document.id])}catch{immutable=true}check(immutable,'Database rejects immutable document modification');
 await writeFile(resolve(integrationState,"browser-target.json"),JSON.stringify({url:`${test.appUrl}${base}?sessionId=${record.id}`,handoff,base,recordId:record.id}),{mode:0o600});await writeFile(resolve(integrationState,"browser-state.json"),JSON.stringify(await api.storageState()),{mode:0o600});
 const browser=await chromium.launch({headless:true});try{const context=await browser.newContext({storageState:await api.storageState()});const page=await context.newPage();await page.goto(`${test.appUrl}${base}?sessionId=${record.id}`,{waitUntil:"domcontentloaded",timeout:180000});await page.getByRole('article',{name:'Saved viability document'}).waitFor();check(await page.getByRole('article',{name:'Saved viability document'}).count()===1,'Authenticated SvelteKit page displays saved document');await page.screenshot({path:resolve(integrationState,'sealed-document.png'),fullPage:true});await context.close();}finally{await browser.close()}
 await pool.query('UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1',[test.grantId]);check((await api.get(handoff)).status()===403,'Revoked grant blocks existing download cookie');check((await api.get(`${base}?sessionId=${record.id}`,{headers:{accept:'application/json'}})).status()===403,'Revoked grant blocks saved-document reads');
 await writeFile(resolve(integrationState,'end-to-end-result.json'),JSON.stringify({passed:true,assertions,stage:'m04',realAuth:true,separateWorker:true,directus:true,savedDocument:true,liveDatabaseChanged:false,at:new Date().toISOString()},null,2),{mode:0o600});
 console.log(`PASS: ${assertions} assertions across real Auth, separate worker, PostgreSQL, Directus, rendered page and immutable export.`);
}finally{await api.dispose();await pool.end()}

function pilotDecision(
  s: any,
  path:
    | "proceed-informed"
    | "adjust"
    | "wait"
    | "accept-constraint"
    | "walk-away" = "proceed-informed",
) {
  return {
    response: path === "proceed-informed" ? "accept" : "override",
    path,
    memoHash: s.presented?.hash ?? "",
    rationale: "Synthetic authorised decision for the workflow test only.",
    allowedOutputs:
      path === "proceed-informed"
        ? ["M04 hypothesis analysis only"]
        : path === "accept-constraint"
          ? ["reduced-private-study"]
          : [],
    deferredOutputs: ["Brand strategy"],
    prohibitedOutputs: ["Production", "Publication", "Spend"],
    reducedName: path === "accept-constraint" ? "private-study" : "",
    reviewDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    expiry: new Date(Date.now() + 86400000 * 30).toISOString(),
    reEntryTrigger: "New real customer evidence",
    closureCondition: "No support for the underlying problem",
    disconfirmation: "Stop if no useful problem is found.",
    switchFindings: [],
    inabilityReason: "",
    override:
      path === "proceed-informed"
        ? null
        : {
            scope: "Synthetic route test only",
            acceptedRisks: ["No real commercial evidence"],
            evidenceLimits: "Synthetic only",
            reviewCondition: "Review when real evidence is available",
            expiry: new Date(Date.now() + 86400000 * 30).toISOString(),
          },
    returnOwner: path === "adjust" ? "m03" : null,
    changedPremise: path === "adjust" ? "Reduce the synthetic commitment" : "",
  };
}
