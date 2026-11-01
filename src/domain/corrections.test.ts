import {it,expect} from 'vitest';
import {createSeed} from '../services/seed';
import {applyCommand,visibleState,projectAccess} from './workflow';
const now=new Date('2026-10-29T10:00:00Z');
function run(s:any,actor:string,c:any){const r=applyCommand(s,actor,c,now);if(!r.ok)throw Error(r.message);return r.value;}
it('a rejected group can edit and resubmit with a recorded deadline, retaining decisions',()=>{
 let s=createSeed(now);const e=s.eois.find(e=>e.id==='eoi-2')!;s.rounds.find(r=>r.id===e.roundId)!.closesAt='2026-10-28T00:00:00Z';
 s=run(s,'coordinator-1',{type:'reviewEOI',eoiId:e.id,decision:'unsuccessful',reason:'Revise your approach and choose available projects.'});
 expect(s.exceptions!.some(x=>x.groupId===e.groupId&&new Date(x.expiresAt)>now)).toBe(true);
 const choices=e.choices.map(c=>({...c,suitability:'Updated team skills',approach:'Updated delivery plan'}));
 s=run(s,s.groups.find(g=>g.id===e.groupId)!.leaderId,{type:'submitEOI',groupId:e.groupId,roundId:e.roundId,choices});
 const revised=s.eois.find(x=>x.id===e.id)!;expect(revised.status).toBe('submitted');expect(revised.version).toBeGreaterThan(1);expect(revised.history.some(h=>h.body.includes('Rejected'))).toBe(true);expect(revised.reason).toBeUndefined();
});
it('students edit their own profile and leaders rename their group without changing submitted snapshots',()=>{
 let s=createSeed(now);const before=structuredClone(s.eois);s=run(s,'student-1',{type:'editProfile',name:'Alex Updated'});s=run(s,'student-1',{type:'renameGroup',groupId:'team-1',name:'New team name'});
 expect(s.users.find(u=>u.id==='student-1')!.name).toBe('Alex Updated');expect(s.groups.find(g=>g.id==='team-1')!.name).toBe('New team name');expect(s.eois).toEqual(before);
 expect(applyCommand(s,'student-2',{type:'renameGroup',groupId:'team-1',name:'Not the leader'} as any,now).ok).toBe(false);
});
it('convenors cannot read student work or project conversations',()=>{
 const s=createSeed(now);s.channels!.push({id:'shared',kind:'shared',projectId:'project-8',groupId:'team-3',memberIds:[],title:'Project work'});s.documents!.push({id:'d',channelId:'shared',title:'Work',name:'work.pdf',mime:'application/pdf',size:10,storageKey:'k',version:1,authorId:'student-9',at:now.toISOString()} as any);
 const view=visibleState(s,'coordinator-1');expect(view.records).toHaveLength(0);expect(view.channels!.some(c=>c.id==='shared')).toBe(false);expect(view.documents).toHaveLength(0);expect(projectAccess(s,s.users.find(u=>u.id==='coordinator-1')!,s.projects[0])).toBe(false);
});
it('proposal submission and solicitation reach the intended role only',()=>{
 let s=createSeed(now);s=run(s,'sponsor-1',{type:'saveProposal',title:'Visible review',brief:'Project description',category:'Web',skills:['React'],outcomes:['Prototype'],submit:true});
 expect(visibleState(s,'coordinator-1').proposals!.some(p=>p.title==='Visible review'&&p.status==='pending')).toBe(true);expect(visibleState(s,'coordinator-1').notifications!.some(n=>n.body.includes('Visible review'))).toBe(true);
 s=run(s,'coordinator-1',{type:'solicitProposal',sponsorId:'sponsor-1',body:'Please propose a community app'});
 expect(visibleState(s,'sponsor-1').notifications!.some(n=>n.body.includes('community app'))).toBe(true);expect(visibleState(s,'sponsor-2').notifications!.some(n=>n.body.includes('community app'))).toBe(false);
});

it('project participants cannot assign hidden project tasks to convenors',()=>{
 const s=createSeed(now);const result=applyCommand(s,'student-9',{type:'saveTask',projectId:'project-8',title:'Private project task',assigneeId:'coordinator-1',dueAt:'2026-11-10T10:00:00Z'},now);expect(result.ok).toBe(false);
});
