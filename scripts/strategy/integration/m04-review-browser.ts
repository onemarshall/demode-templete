/** Browser review regression; use only the guarded local contract-server setup. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {request,chromium} from '@playwright/test';
import {readConnection,integrationState} from './local-stack';
import {FIELD_DEFINITIONS} from '../../../src/lib/modules/strategy/shared/fields/m04';
const config=await readConnection();const read=async(n:string)=>JSON.parse(await readFile(join(integrationState,n),'utf8'));
const test=await read('test.json'),fixture=await read('fixture.json'),target=await read('browser-target.json'),env=await read('runtime-env.json');
if(new URL(test.appUrl).origin!=='http://127.0.0.1:5188'||new URL(env.TRIGGER_API_URL).origin!=='http://127.0.0.1:8135'||new URL(env.STRATEGY_PROVIDER_URL).origin!=='http://127.0.0.1:8134')throw new Error('Expected the isolated local contract setup');
const pool=new Pool({connectionString:config.databaseUrl});const api=await request.newContext({baseURL:test.appUrl,extraHTTPHeaders:{origin:test.appUrl,accept:'application/json'}});
let assertions=0;const check=(value:unknown,message:string)=>{if(!value)throw new Error(message);assertions++};let browser;
try{
 await pool.query('UPDATE strategy_access_grant SET revoked_at=NULL WHERE id=$1',[test.grantId]);
 const sign=await api.post(test.appUrl+'/api/auth/sign-in/email',{data:{email:test.email,password:test.password}});check(sign.ok(),'Synthetic sign-in');
 const post=async(data:any)=>{const r=await api.post(test.appUrl+target.base,{data});if(!r.ok())throw new Error(`Command ${data.action} rejected (${r.status()})`);return r.json()};
 let record=await post({action:'create',commandId:randomUUID()});
 const command=(action:string,extra:any={})=>({action,sessionId:record.id,expectedRevision:record.revision,commandId:randomUUID(),...extra});
 const job=await post(command('draft',{stage:'context'}));
 const waitForJob=async(jobId:string,label:string)=>{let status;for(let i=0;i<100;i++){const r=await api.get(`${test.appUrl}${target.base}?sessionId=${record.id}&jobId=${jobId}`);const body=await r.json();status=body.status;if(status==='succeeded'||status==='failed')break;await new Promise(r=>setTimeout(r,250))}check(status==='succeeded',`Local ${label} worker completed`)};
 await waitForJob(job.jobId,'draft');
 const reload=async()=>{const body=await (await api.get(`${test.appUrl}${target.base}?sessionId=${record.id}`)).json();record={id:body.session.sessionId,revision:body.session.revision,payload:body.session};return body};await reload();
 const chat=await post(command('chat',{stage:'context',message:null}));check(!!chat.jobId,'Starting the context conversation enqueues a durable SQL job');await waitForJob(chat.jobId,'chat');
 const afterChat=await reload();const chatTurn=record.payload.history.filter((item:any)=>item.action==='chat-turn'&&item.stage==='context').at(-1);
 check(!!chatTurn,'Completed chat turn is saved in session history');check(chatTurn.messages?.some((item:any)=>item.role==='assistant'&&item.content==='Synthetic adviser response for this disposable test.'),'Saved chat turn contains the local synthetic assistant response');check(afterChat.session.revision===record.revision,'Reload returns the latest committed chat revision');
 browser=await chromium.launch({headless:true});const context=await browser.newContext({storageState:await api.storageState()});const page=await context.newPage();page.on('pageerror',error=>console.error('Browser:',error.message));const url=`${test.appUrl}${target.base}?sessionId=${record.id}`;
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});const savedChat=page.getByText(/Synthetic adviser response for this disposable test\./);await savedChat.waitFor();check(await savedChat.isVisible(),'Saved chat history is shown in the browser');await page.getByText('Suggested candidate.',{exact:true}).waitFor();check(await page.getByText('Suggested candidate.',{exact:true}).isVisible(),'Suggested candidate is clearly labelled');
 check(!record.payload.confirmations.context,'Suggestion is not a confirmation');
 await page.getByRole('button',{name:'Confirm this step',exact:true}).click();await page.getByRole('heading',{name:FIELD_DEFINITIONS['conviction-cost'].label,exact:true}).waitFor();await reload();check(!!record.payload.confirmations.context,'Explicit UI confirmation persisted');
 await page.getByRole('button',{name:new RegExp(FIELD_DEFINITIONS.context.label)}).click();await page.getByText('Confirmed record.',{exact:true}).waitFor();
 check(await page.locator('fieldset').first().getByRole('textbox').first().isDisabled(),'Confirmed fields remain visible and read-only');
 check(await page.getByRole('button',{name:'Confirm this step',exact:true}).count()===0,'Confirmed step cannot be re-confirmed without reopening');
 await page.getByRole('button',{name:'Reopen this step',exact:true}).click();await page.getByRole('button',{name:'Confirm this step',exact:true}).waitFor();await reload();check(!record.payload.confirmations.context,'Reopening invalidates confirmation');
 for(const stage of ['context','conviction-cost','market-readiness','human-load','financial-grounding','awareness-and-weighing','recommendation'])record=await post(command('confirm',{stage,payload:fixture.candidates[stage]}));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});await page.getByRole('heading',{name:'Exact recommendation for human review',exact:true}).waitFor();
 check(await page.locator('pre').innerText()===JSON.stringify(record.payload.data.recommendation,null,2),'Decision screen displays the exact saved recommendation');
 check(!(await page.getByRole('button',{name:'Record human decision',exact:true}).isEnabled()),'Decision is gated until presentation');
 await page.getByRole('button',{name:'Present exact recommendation',exact:true}).click();await page.getByText(/Presented version hash:/).waitFor();await reload();
 check(await page.getByRole('button',{name:'Record human decision',exact:true}).isEnabled(),'Presented recommendation enables separate decision');
 check((await page.locator('code').innerText())===record.payload.presented.hash,'Displayed presentation hash matches the stored receipt');
 await page.screenshot({path:join(integrationState,'m04-review-decision.png'),fullPage:true});
 record=await post(command('decide',{payload:pilotDecision(record.payload)}));record=await post(command('seal'));check(!!record.payload.seal,'Normal synthetic decision and seal still work');
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});await page.getByRole('article',{name:'Saved viability document'}).waitFor();check(await page.getByRole('article',{name:'Saved viability document'}).count()===1,'Sealed document remains visible');
 await context.close();
 await writeFile(join(integrationState,'m04-review-browser-result.json'),JSON.stringify({passed:true,assertions,synthetic:true,provider:'loopback-contract',at:new Date().toISOString()},null,2),{mode:0o600});console.log(`PASS: ${assertions} M04 review/confirmation/decision browser assertions.`);
}finally{await browser?.close();await pool.query('UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1',[test.grantId]);await api.dispose();await pool.end()}

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
