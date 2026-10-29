/** Apply only the M01 migration to the explicitly guarded disposable database. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {readConnection} from './local-stack';
const connection=await readConnection();
const pool=new Pool({connectionString:connection.databaseUrl});
const client=await pool.connect();
try {
 const name='0012_strategy_m01_attribution.sql';
 const sql=await readFile(new URL('../../../database/migrations/'+name,import.meta.url),'utf8');
 const checksum=createHash('sha256').update(sql).digest('hex');
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(1296916814,1)');
 const prior=(await client.query('SELECT checksum FROM schema_migrations WHERE version=12')).rows[0];
 if(prior&&prior.checksum!==checksum)throw new Error('Applied M01 migration differs; do not rewrite history');
 if(!prior){await client.query(sql);await client.query('INSERT INTO schema_migrations(version,name,checksum) VALUES(12,$1,$2)',[name,checksum]);}
 await client.query('COMMIT');console.log('M01 attribution migration verified on disposable integration database only.');
} catch(error){await client.query('ROLLBACK');throw error}finally{client.release();await pool.end()}
