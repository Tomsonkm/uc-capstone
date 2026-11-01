import { describe,it,expect } from 'vitest';
import { createLocalRepository } from './localRepository';
import { createSeed } from './seed';
const now=()=>new Date('2026-10-09T01:00:00Z');
describe('local repository',()=>{
 it('rejects malformed record timestamps before workspace rendering',()=>{const state=createSeed(now());state.records[0].createdAt='bad timestamp';localStorage.setItem('uc-capstone-demo-v1',JSON.stringify(state));const r=createLocalRepository(localStorage,now);expect(r.recoveryNotice()).not.toBe('');expect(Number.isFinite(Date.parse(r.snapshot().records[0].createdAt))).toBe(true);});
 it('rejects dangling group members before student rendering',()=>{const state=createSeed(now());state.groups[0].memberIds.push('missing-user');localStorage.setItem('uc-capstone-demo-v1',JSON.stringify(state));const r=createLocalRepository(localStorage,now);expect(r.recoveryNotice()).not.toBe('');expect(r.snapshot().groups[0].memberIds).not.toContain('missing-user');});
 it('persists skill changes across repository refresh',()=>{const r=createLocalRepository(localStorage,now);expect(r.dispatch('student-1',{type:'editSkills',skills:['Rust']}).ok).toBe(true);expect(createLocalRepository(localStorage,now).snapshot().users.find(u=>u.id==='student-1')?.skills).toEqual(['Rust']);});
 it('recovers from malformed stored data',()=>{localStorage.setItem('uc-capstone-demo-v1','{broken');expect(createLocalRepository(localStorage,now).snapshot().projects.length).toBeGreaterThan(3);});
 it('recovers incompatible structured data',()=>{localStorage.setItem('uc-capstone-demo-v1',JSON.stringify({version:1,users:[],projects:'wrong'}));expect(createLocalRepository(localStorage,now).snapshot().groups.length).toBeGreaterThan(0);});
 it('keeps session changes when writes are blocked',()=>{const blocked={getItem:()=>null,setItem:()=>{throw Error('Blocked')},removeItem:()=>{}} as unknown as Storage;const r=createLocalRepository(blocked,now);expect(r.dispatch('student-1',{type:'editSkills',skills:['Rust']}).ok).toBe(true);expect(r.persistenceStatus()).toBe('memory');expect(r.snapshot().users[0].skills).toContain('Rust');});
 it('does not overwrite state after a rejected command',()=>{const r=createLocalRepository(localStorage,now);const before=r.snapshot();expect(r.dispatch('sponsor-1',{type:'allocate',groupId:'team-1',projectId:'project-1',rationale:'Test'}).ok).toBe(false);expect(r.snapshot()).toEqual(before);});
});
