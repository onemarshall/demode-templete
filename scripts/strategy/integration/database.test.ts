import {test,expect} from 'bun:test';
import {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {readConnection} from './local-stack';

test('Directus primary-key migration preserves existing immutable records and scoped foreign keys',async()=>{
 const config=await readConnection(),schema=`strategy_compat_${randomUUID().replaceAll('-','')}`;
 const admin=new Pool({connectionString:config.databaseUrl});await admin.query(`CREATE SCHEMA ${schema}`);
 const pool=new Pool({connectionString:config.databaseUrl,options:`-c search_path=${schema}`});
 try {
  for(const file of ['0004_strategy_core.sql','0005_strategy_jobs.sql'])await pool.query(await readFile(`database/migrations/${file}`,'utf8'));
  const canonical='{"z":"Original bytes","a":{"two":2,"one":1}}',hash=createHash('sha256').update(canonical).digest('hex');
  await pool.query('BEGIN');
  await pool.query("INSERT INTO strategy_brand_binding VALUES('org','brand')");
  await pool.query("INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES('org','brand','engagement','Synthetic','synthetic-user')");
  await pool.query("INSERT INTO strategy_session VALUES('org','brand','engagement','session','m04',1)");
  await pool.query("INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES('org','brand','engagement','session',1,'create','synthetic-user','edit','{}',$1::text::jsonb,$1::text)",[canonical]);
  await pool.query("INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,session_id,revision,canonical_payload,seal_hash,hash_algorithm) VALUES('org','brand','engagement','version','session',1,$1,$2,'json-sha256')",[canonical,hash]);
  await pool.query("INSERT INTO strategy_document VALUES('org','brand','engagement','document','version','viability-check','# Synthetic document',$1)",[hash]);
  await pool.query('COMMIT');
  const foreignKeys=()=>pool.query("SELECT count(*)::int count FROM pg_constraint WHERE connamespace=$1::regnamespace AND contype='f'",[schema]);
  const before=(await foreignKeys()).rows[0].count;
  await pool.query('BEGIN');await pool.query(await readFile('database/migrations/0006_strategy_directus.sql','utf8'));await pool.query('COMMIT');
  expect((await foreignKeys()).rows[0].count).toBe(before);
  const primaryKeys=await pool.query("SELECT c.relname,array_length(p.conkey,1) width FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid WHERE p.contype='p' AND c.relnamespace=$1::regnamespace AND c.relname LIKE 'strategy_%'",[schema]);
  expect(primaryKeys.rows.every(row=>row.width===1)).toBe(true);
  const stored=(await pool.query('SELECT canonical_payload,seal_hash,record_id FROM strategy_version')).rows[0];
  expect(stored.canonical_payload).toBe(canonical);expect(stored.seal_hash).toBe(hash);expect(stored.record_id).toMatch(/^[0-9a-f-]{36}$/);
  expect((await pool.query('SELECT payload_text FROM strategy_revision')).rows[0].payload_text).toBe(canonical);
  await expect(pool.query("UPDATE strategy_version SET canonical_payload='changed'")).rejects.toThrow('immutable');
  await expect(pool.query("UPDATE strategy_document SET content='changed'")).rejects.toThrow('immutable');
  await pool.query("INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES('org','other')");
  await pool.query("INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES('org','other','engagement','Other synthetic','synthetic-user')");
  await expect(pool.query("INSERT INTO strategy_document(organisation_id,brand_id,engagement_id,id,version_id,kind,content,hash) VALUES('org','other','engagement','cross-brand','version','test','Must not attach',$1)",[hash])).rejects.toThrow('foreign key');
 }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
},30_000);
