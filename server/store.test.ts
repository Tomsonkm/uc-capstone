// @vitest-environment node
import {it,expect} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {loadState,commitState,initialiseCatalogue} from './store';
import type {AppState} from '../src/domain/types';
import {readFileSync} from 'node:fs';
import {applyCommand} from '../src/domain/workflow';
class Statement{constructor(private db:DatabaseSync,private sql:string,private args:any[]=[]){ }bind(...args:any[]){return new Statement(this.db,this.sql,args);}async first(){return this.db.prepare(this.sql).get(...this.args)||null;}async all(){return {results:this.db.prepare(this.sql).all(...this.args)};}async run(){return {meta:{changes:Number(this.db.prepare(this.sql).run(...this.args).changes)}};}}
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_platform.sql','utf8'));return {prepare:(sql:string)=>new Statement(sqlite,sql),batch:async(statements:Statement[])=>{sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};}
it('loads the real account username for student search',async()=>{
 const db=database();await initialiseCatalogue(db as any);
 await db.prepare('INSERT INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,1,1,?)').bind('real-student','student@example.edu','canberra.builder','Student Name','student',new Date().toISOString()).run();
 expect((await loadState(db as any)).state.users.find(u=>u.id==='real-student')).toMatchObject({username:'canberra.builder'});
});
it('persists unit selection and group deletion through the real account store',async()=>{
 const db=database();await initialiseCatalogue(db as any);const now=new Date();
 await db.prepare('INSERT INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,1,1,?)').bind('leader','leader@example.edu','leader','Leader','student',now.toISOString()).run();
 let loaded=await loadState(db as any);loaded.state.groups.push({id:'real-group',name:'Real group',cycleId:'cycle',leaderId:'leader',memberIds:['leader'],invitations:[]});
 const selected=applyCommand(loaded.state,'leader',{type:'setGroupUnit',groupId:'real-group',unitCode:'11522'},now);if(!selected.ok)throw Error(selected.message);
 expect(await commitState(db as any,selected.value,loaded.revision,'select-unit','leader')).toBe(true);loaded=await loadState(db as any);expect(loaded.state.groups[0].unitCode).toBe('11522');
 const deleted=applyCommand(loaded.state,'leader',{type:'deleteGroup',groupId:'real-group'},now);if(!deleted.ok)throw Error(deleted.message);
 expect(await commitState(db as any,deleted.value,loaded.revision,'delete-group','leader')).toBe(true);loaded=await loadState(db as any);expect(loaded.state.groups).toHaveLength(0);expect(loaded.state.users[0].id).toBe('leader');expect(loaded.state.audit!.some(a=>a.action==='deleteGroup')).toBe(true);
});
it('imports 66 source projects idempotently without fictional accounts',async()=>{const db=database();await initialiseCatalogue(db as any);await initialiseCatalogue(db as any);const {state}=await loadState(db as any);expect(state.projects).toHaveLength(66);expect(state.users).toHaveLength(0);expect(new Set(state.projects.map(p=>p.id)).size).toBe(66);});
it('a stale concurrent write cannot commit its records or its receipt',async()=>{const db=database();await initialiseCatalogue(db as any);const a=await loadState(db as any),b=await loadState(db as any);a.state.history.push({at:new Date().toISOString(),body:'First write'});b.state.history.push({at:new Date().toISOString(),body:'Stale write'});expect(await commitState(db as any,a.state,a.revision,'one','actor')).toBe(true);expect(await commitState(db as any,b.state,b.revision,'two','actor')).toBe(false);const latest=await loadState(db as any);expect(latest.state.history.map(h=>h.body)).toContain('First write');expect(latest.state.history.map(h=>h.body)).not.toContain('Stale write');expect(await db.prepare('SELECT * FROM operations WHERE id=?').bind('two').first()).toBeNull();});
it('an idempotency receipt belongs to its original actor',async()=>{const db=database();await initialiseCatalogue(db as any);const a=await loadState(db as any);expect(await commitState(db as any,a.state,a.revision,'same','first-actor')).toBe(true);const row=await db.prepare('SELECT * FROM operations WHERE id=?').bind('same').first() as any;expect(row.actor_id).toBe('first-actor');});
it('account permissions and audit commit together and stale changes are rejected',async()=>{
 const db=database();await initialiseCatalogue(db as any);await db.prepare('INSERT INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,1,1,?)').bind('target','target@example.edu','target','Target','student',new Date().toISOString()).run();
 const first=await loadState(db as any),stale=await loadState(db as any);first.state.audit!.push({id:'change',actorId:'admin',action:'account-access',recordId:'target',reason:'Approved mentor',at:new Date().toISOString()});
 expect(await (commitState as any)(db,first.state,first.revision,'change-role','admin',{id:'target',role:'mentor',approved:true,active:true})).toBe(true);
 expect((await db.prepare('SELECT role FROM accounts WHERE id=?').bind('target').first() as any).role).toBe('mentor');
 expect(await (commitState as any)(db,stale.state,stale.revision,'stale-role','admin',{id:'target',role:'sponsor',approved:true,active:true})).toBe(false);
 expect((await db.prepare('SELECT role FROM accounts WHERE id=?').bind('target').first() as any).role).toBe('mentor');expect((await loadState(db as any)).state.audit).toHaveLength(1);
});
