import type {AppState,User} from '../src/domain/types';
import catalogue from '../src/data/projects-s2-2026.json';
import {hydratePlatform} from '../src/domain/platformWorkflow';
export interface DB {prepare(sql:string):any;batch(statements:any[]):Promise<any[]>}
export const semester='2026-S2';
const collections=['users','groups','projects','rounds','eois','allocations','records','history','proposals','interests','notifications','channels','messages','documents','tasks','exceptions','allocationDrafts','sponsorDecisions','audit'] as const;
export async function initialiseCatalogue(db:DB){
 await db.prepare('INSERT OR IGNORE INTO semesters (id,revision,mutation) VALUES (?,0,?)').bind(semester,'').run();
 const rows=catalogue.map(p=>({id:p.id,body:JSON.stringify(p)}));
 for(let n=0;n<rows.length;n+=20){const batch=rows.slice(n,n+20);await db.prepare(`INSERT OR IGNORE INTO entities (collection,id,body) VALUES ${batch.map(()=>'(?,?,?)').join(',')}`).bind(...batch.flatMap(p=>['projects',p.id,p.body])).run();}
}
export async function loadState(db:DB):Promise<{state:AppState;revision:number}>{
 const clock=await db.prepare('SELECT revision FROM semesters WHERE id=?').bind(semester).first();
 const records=await db.prepare('SELECT collection,id,body FROM entities ORDER BY collection,id').all();
 const state:any={version:1};for(const key of collections)state[key]=[];
 for(const row of records.results||[]){if(collections.includes(row.collection))state[row.collection].push(JSON.parse(row.body));}
 const people=await db.prepare('SELECT * FROM accounts WHERE approved=1 AND active=1').all();
 state.users=(people.results||[]).map((a:any)=>{const profile=state.users.find((u:User)=>u.id===a.id);return {...profile,id:a.id,email:a.email,username:a.username,name:profile?.name||a.name,role:a.role,active:true,skills:profile?.skills||[]};});
 return {state:hydratePlatform(state),revision:clock?.revision||0};
}
function rows(state:AppState){const result=new Map<string,{collection:string;id:string;body:string}>();for(const collection of collections){for(const [index,value] of (state[collection]||[]).entries()){const id='id' in value?String(value.id):String(index).padStart(10,'0');result.set(`${collection}:${id}`,{collection,id,body:JSON.stringify(value)});}}return result;}
export async function commitState(db:DB,next:AppState,revision:number,operationId:string,actorId:string,accountChange?:{id:string;role:string;approved:boolean;active:boolean}):Promise<boolean>{
 const receipt=await db.prepare('SELECT actor_id FROM operations WHERE id=?').bind(operationId).first();if(receipt)return receipt.actor_id===actorId;
 const before=await loadState(db);if(before.revision!==revision)return false;
 const previous=rows(before.state),updated=rows(next),guard='EXISTS (SELECT 1 FROM semesters WHERE id=? AND mutation=?)',ops=[db.prepare('UPDATE semesters SET revision=revision+1,mutation=? WHERE id=? AND revision=?').bind(operationId,semester,revision)];
 for(const [key,row] of updated){if(previous.get(key)?.body===row.body)continue;ops.push(db.prepare(`INSERT INTO entities (collection,id,body) SELECT ?,?,? WHERE ${guard} ON CONFLICT(collection,id) DO UPDATE SET body=excluded.body`).bind(row.collection,row.id,row.body,semester,operationId));}
 for(const [key,row] of previous){if(!updated.has(key))ops.push(db.prepare(`DELETE FROM entities WHERE collection=? AND id=? AND ${guard}`).bind(row.collection,row.id,semester,operationId));}
 ops.push(db.prepare(`INSERT INTO operations (id,actor_id,created_at) SELECT ?,?,? WHERE ${guard}`).bind(operationId,actorId,new Date().toISOString(),semester,operationId));
 if(accountChange)ops.push(db.prepare(`UPDATE accounts SET role=?,approved=?,active=? WHERE id=? AND ${guard}`).bind(accountChange.role,accountChange.approved?1:0,accountChange.active?1:0,accountChange.id,semester,operationId));
 const result=await db.batch(ops);return Number(result[0]?.meta?.changes)>0;
}
