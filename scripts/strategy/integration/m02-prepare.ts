/** Synthetic-only compatibility setup for the retained integration database. */
import { Pool } from 'pg';
import { stripe } from '@better-auth/stripe';
import Stripe from 'stripe';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readConnection,integrationState } from './local-stack';
import { m02Drafts } from '../../../tests/strategy/fixtures/m02';
const connection=await readConnection();
const pool=new Pool({connectionString:connection.databaseUrl});
try {
 // Current Auth reads Stripe's retained subscription table. This disposable
 // stack predates that change. Create its exact installed-plugin shape only;
 // do not run pending application migrations or contact Stripe.
 const plugin=stripe({stripeClient:new Stripe('sk_test_synthetic_no_requests'),stripeWebhookSecret:'whsec_synthetic',subscription:{enabled:true,plans:[]}});
 const fields=plugin.schema!.subscription.fields;
 const quote=(value:string)=>'"'+value.replaceAll('"','""')+'"';
 const columns=Object.entries(fields).map(([name,field])=>{
  const type=field.type==='date'?'timestamptz':field.type==='boolean'?'boolean':field.type==='number'?'numeric':'text';
  return `${quote(name)} ${type}`;
 });
 await pool.query(`CREATE TABLE IF NOT EXISTS subscription (id text PRIMARY KEY,${columns.join(',')})`);
 const envPath=resolve(integrationState,'runtime-env.json');
 const env=JSON.parse(await readFile(envPath,'utf8'));
 env.WRANGLER_LOG_PATH=resolve(integrationState,'wrangler.log');
 await writeFile(envPath,JSON.stringify(env),{mode:0o600});
 await writeFile(resolve(integrationState,'m02-draft-fixture.json'),JSON.stringify(m02Drafts),{mode:0o600});
 console.log('Prepared synthetic M02 candidates and the installed Stripe plugin table in the guarded test database. No provider or payment request.');
}finally{await pool.end()}
