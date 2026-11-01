// @vitest-environment node
import {it,expect} from 'vitest';
import {createSeed} from '../src/services/seed';
import {createSnapshot,validateSnapshot} from './backups';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
it('preserves reviewed records and document references and detects a changed snapshot',async()=>{const state=createSeed();state.documents=[{id:'file',channelId:'ch',title:'Report',name:'report.pdf',mime:'application/pdf',size:100,authorId:'student-1',at:new Date().toISOString(),version:2,storageKey:'documents/private'}];const snapshot=await createSnapshot(state,[]);expect((await validateSnapshot(snapshot)).payload.state.allocations).toEqual(state.allocations);expect((await validateSnapshot(snapshot)).payload.state.documents?.[0].storageKey).toBe('documents/private');snapshot.payload.state.projects[0].title='tampered';await expect(validateSnapshot(snapshot)).rejects.toThrow('checksum');});
it('rejects credential-bearing account exports',async()=>{const snapshot=await createSnapshot(createSeed(),[{id:'person',password:'must-not-be-exported'}]);await expect(validateSnapshot(snapshot)).rejects.toThrow('credentials');});
it('restores a verified snapshot into a new isolated database without overwriting it',async()=>{const folder=mkdtempSync(join(tmpdir(),'capstone-restore-')),source=join(folder,'snapshot.json'),target=join(folder,'restored.sqlite');try{const state=createSeed();writeFileSync(source,JSON.stringify(await createSnapshot(state,[])));const restored=spawnSync(process.execPath,['scripts/restore-backup.mjs',source,'--output',target],{encoding:'utf8'});expect(restored.status,restored.stderr).toBe(0);const db=new DatabaseSync(target);expect((db.prepare("SELECT COUNT(*) AS n FROM entities WHERE collection='projects'").get() as any).n).toBe(state.projects.length);db.close();const again=spawnSync(process.execPath,['scripts/restore-backup.mjs',source,'--output',target],{encoding:'utf8'});expect(again.status).not.toBe(0);}finally{rmSync(folder,{recursive:true,force:true});}});

it('administrative snapshots exclude student work and personal conversations',async()=>{
 const {createAdministrativeSnapshot}=await import('./backups');const {createSeed}=await import('../src/services/seed');const state=createSeed();state.channels!.push({id:'private',kind:'shared',projectId:'project-8',title:'Private work',memberIds:[]});state.messages!.push({id:'m',channelId:'private',authorId:'student-9',body:'Private student message',at:new Date().toISOString()});
 const snapshot=await createAdministrativeSnapshot(state,[],'coordinator-1');expect(snapshot.payload.state.records).toHaveLength(0);expect(snapshot.payload.state.messages).toHaveLength(0);expect(snapshot.payload.state.documents).toHaveLength(0);expect(snapshot.payload.state.tasks).toHaveLength(0);
});

it('administrative snapshots fail closed if the convenor did not exist in historical users',async()=>{
 const {createAdministrativeSnapshot}=await import('./backups');const {createSeed}=await import('../src/services/seed');await expect(createAdministrativeSnapshot(createSeed(),[],'new-convenor-not-in-snapshot')).rejects.toThrow('convenor');
});
