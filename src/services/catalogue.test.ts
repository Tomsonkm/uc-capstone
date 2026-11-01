import {it,expect} from 'vitest';
import {createSeed} from './seed';
import {createLocalRepository} from './localRepository';
import {validateState} from './validateState';
it('loads the 66 populated source projects with distinct internal IDs and original codes',()=>{
 const state=createSeed();
 const projects=state.projects.filter(p=>p.id.startsWith('uc-s2-2026-'));
 expect(projects).toHaveLength(66);
 expect(new Set(projects.map(p=>p.id)).size).toBe(66);
 expect(projects.filter(p=>p.code==='2026-S2-05')).toHaveLength(2);
 expect(projects.some(p=>p.title==='Capstone Project Management Web Application')).toBe(true);
 expect(projects.every(p=>p.status==='published'&&p.sponsorId===''&&p.mentorId==='')).toBe(true);
 expect(()=>validateState(state)).not.toThrow();
});
it('updates returning browsers without losing saved work or changing imported allocation status',()=>{
 const saved=createSeed();saved.projects=saved.projects.filter(p=>!p.id.startsWith('uc-s2-2026-'));
 saved.users[0].skills=['Rust'];const originalRecords=structuredClone(saved.records);
 localStorage.setItem('uc-capstone-demo-v1',JSON.stringify(saved));
 const repo=createLocalRepository(localStorage,()=>new Date());
 expect(repo.snapshot().projects.filter(p=>p.id.startsWith('uc-s2-2026-'))).toHaveLength(66);
 expect(repo.snapshot().users[0].skills).toEqual(['Rust']);expect(repo.snapshot().records).toEqual(originalRecords);
 expect(repo.dispatch('student-1',{type:'saveDraft',groupId:'team-1',roundId:'round-1',choices:[]} ).ok).toBe(true);
 expect(createLocalRepository(localStorage,()=>new Date()).snapshot().projects.filter(p=>p.id.startsWith('uc-s2-2026-'))).toHaveLength(66);
});
it('preserves a saved allocation for an imported project across refresh',()=>{
 const state=createSeed();const project=state.projects.find(p=>p.id==='uc-s2-2026-01')!;project.status='allocated';
 state.allocations.push({id:'new-allocation',projectId:project.id,groupId:'team-1',mentorId:'coordinator-1',createdAt:new Date().toISOString(),rationale:'Demo decision'});
 localStorage.setItem('uc-capstone-demo-v1',JSON.stringify(state));
 const repo=createLocalRepository(localStorage,()=>new Date());
 expect(repo.recoveryNotice()).toBe('');expect(repo.snapshot().projects.find(p=>p.id===project.id)?.status).toBe('allocated');
 expect(repo.snapshot().allocations.find(a=>a.id==='new-allocation')?.projectId).toBe(project.id);
});
it('rejects malformed source metadata before rendering',()=>{
 const state=createSeed();(state.projects[0] as unknown as {scope:unknown}).scope={invalid:true};
 expect(()=>validateState(state)).toThrow();
});
it('rejects malformed source notes before rendering',()=>{
 const state=createSeed();(state.projects[0] as unknown as {sourceNote:unknown}).sourceNote={invalid:true};
 expect(()=>validateState(state)).toThrow();
});
