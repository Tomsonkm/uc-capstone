import { describe, it, expect } from 'vitest';
import { applyCommand, validateEOI, visibleState, availableStudents } from './workflow';
import type { AppState, EOIChoice, Command } from './types';
const now = new Date('2026-10-09T01:00:00Z');
it('allows only the leader to delete an unsubmitted group and releases its members',()=>{
 const s=fixture();s.eois.push({id:'draft',groupId:'g',roundId:'r',status:'draft',choices:[],history:[]});
 expect(applyCommand(s,'s2',{type:'deleteGroup',groupId:'g'},now).ok).toBe(false);
 const result=applyCommand(s,'s1',{type:'deleteGroup',groupId:'g'},now);expect(result.ok).toBe(true);
 if(result.ok){expect(result.value.groups).toHaveLength(0);expect(result.value.eois).toHaveLength(0);expect(applyCommand(result.value,'s2',{type:'createGroup',name:'New group'},now).ok).toBe(true);}
 for(const protectedState of [submitted(),{...s,allocations:[{id:'a',groupId:'g',projectId:'p1',mentorId:'m',createdAt:now.toISOString(),rationale:'Approved'}]}])expect(applyCommand(protectedState,'s1',{type:'deleteGroup',groupId:'g'},now).ok).toBe(false);
});
it('persists a valid unit choice before application rounds exist without allowing EOI submission',()=>{
 const s=fixture();s.rounds=[];
 const result=applyCommand(s,'s1',{type:'setGroupUnit',groupId:'g',unitCode:'11522'},now);expect(result.ok).toBe(true);
 if(result.ok)expect(result.value.groups[0].unitCode).toBe('11522');
 expect(applyCommand(s,'s2',{type:'setGroupUnit',groupId:'g',unitCode:'9785'},now).ok).toBe(false);
 expect(applyCommand(s,'s1',submit,now).ok).toBe(false);
});
it('only offers ungrouped active students without an existing invitation, including in a filtered view',()=>{
 const s=fixture();s.groups.push({id:'other',name:'Private group',cycleId:'cycle',leaderId:'s4',memberIds:['s4'],invitations:[]});
 expect(availableStudents(visibleState(s,'s1'),'g').map(u=>u.id)).toEqual(['s5']);
 s.groups[0].invitations.push({userId:'s5',status:'pending'});expect(availableStudents(visibleState(s,'s1'),'g')).toEqual([]);
 expect(applyCommand(s,'s1',{type:'invite',groupId:'g',userId:'s4'},now).ok).toBe(false);
});
function fixture(): AppState {
  return {version:1,users:[
    {id:'s1',name:'Student One',role:'student',skills:['React']},
    {id:'s2',name:'Student Two',role:'student',skills:['SQL']},
    {id:'s3',name:'Student Three',role:'student',skills:['UX']},
    {id:'s4',name:'Student Four',role:'student',skills:[]},
    {id:'s5',name:'Student Five',role:'student',skills:[]},
    {id:'m',name:'Mentor',role:'mentor',skills:[]},
    {id:'c',name:'Coordinator',role:'coordinator',skills:[]},
    {id:'sp',name:'Sponsor',role:'sponsor',skills:[]},
    {id:'sp2',name:'Another sponsor',role:'sponsor',skills:[]}
  ],groups:[{id:'g',name:'Team',cycleId:'cycle',leaderId:'s1',memberIds:['s1','s2','s3'],invitations:[]}],
  projects:['p1','p2','p3','p4'].map((id,i)=>({id,title:`Project ${i+1}`,category:'Technology',sponsorId:'sp',mentorId:'m',sponsor:'Fictional sponsor',brief:'Build a useful application.',outcomes:['Application'],skills:['React'],status:'published',cycleId:'cycle',art:'orbit'})),
  rounds:[{id:'r',cycleId:'cycle',sequence:1,opensAt:'2026-10-01T00:00:00Z',closesAt:'2026-10-20T00:00:00Z',status:'open'}],eois:[],allocations:[],records:[],history:[]};
}
const choices:EOIChoice[]=['p1','p2','p3'].map((projectId,i)=>({projectId,rank:(i+1) as 1|2|3,suitability:'We have relevant development experience.',approach:'Discover requirements, build and validate.'}));
const submit:Command={type:'submitEOI',groupId:'g',roundId:'r',choices};
function submitted(){const result=applyCommand(fixture(),'s1',submit,now);if(!result.ok)throw Error(result.message);return result.value;}
describe('ranked group EOI',()=>{
  it('keeps partial revision drafts separate from the submitted choices',()=>{const s=submitted();const r=applyCommand(s,'s1',{type:'saveDraft',groupId:'g',roundId:'r',choices:choices.slice(0,2)},now);expect(r.ok).toBe(true);if(r.ok){expect(r.value.eois[0].choices).toHaveLength(3);expect(r.value.eois[0].draftChoices).toHaveLength(2);}});
  it('does not change mentor-facing explanations until revised EOI is explicitly sent',()=>{const s=submitted();const changed=choices.map(c=>({...c,approach:'Revised plan not yet submitted'}));const draft=applyCommand(s,'s1',{type:'saveDraft',groupId:'g',roundId:'r',choices:changed},now);expect(draft.ok).toBe(true);if(draft.ok){expect(draft.value.eois[0].choices[0].approach).toBe('Discover requirements, build and validate.');const sent=applyCommand(draft.value,'s1',{type:'submitEOI',groupId:'g',roundId:'r',choices:changed},new Date('2026-10-10T00:00:00Z'));expect(sent.ok).toBe(true);if(sent.ok){expect(sent.value.eois[0].choices[0].approach).toBe('Revised plan not yet submitted');expect(sent.value.eois[0].draftChoices).toBeUndefined();expect(sent.value.eois[0].firstSubmittedAt).toBe('2026-10-09T01:00:00.000Z');}}});
  it('accepts three distinct choices for three accepted members',()=>expect(validateEOI(fixture(),'g','r',choices,now).ok).toBe(true));
  it('rejects duplicate project preferences',()=>expect(validateEOI(fixture(),'g','r',[choices[0],choices[0],choices[2]],now).ok).toBe(false));
  it('rejects whitespace-only suitability',()=>expect(validateEOI(fixture(),'g','r',choices.map(x=>({...x,suitability:' '})),now).ok).toBe(false));
  it('rejects two accepted members',()=>{const s=fixture();s.groups[0].memberIds.pop();expect(validateEOI(s,'g','r',choices,now).ok).toBe(false);});
  it('allows four accepted members',()=>{const s=fixture();s.groups[0].memberIds.push('s4');expect(validateEOI(s,'g','r',choices,now).ok).toBe(true);});
  it('closes exactly at the deadline',()=>expect(validateEOI(fixture(),'g','r',choices,new Date('2026-10-20T00:00:00Z')).ok).toBe(false));
  it('rejects before opening',()=>expect(validateEOI(fixture(),'g','r',choices,new Date('2026-09-01T00:00:00Z')).ok).toBe(false));
  it('requires three choices when four are available',()=>expect(validateEOI(fixture(),'g','r',choices.slice(0,2),now).ok).toBe(false));
  it('allows two choices when only two projects remain',()=>{const s=fixture();s.projects=s.projects.slice(0,2);expect(validateEOI(s,'g','r',choices.slice(0,2),now).ok).toBe(true);});
  it('rejects an allocated draft project without mutating draft',()=>{const s=fixture();s.projects[0].status='allocated';s.eois=[{id:'draft',groupId:'g',roundId:'r',choices,status:'draft',history:[]}];expect(applyCommand(s,'s1',submit,now).ok).toBe(false);expect(s.eois[0].choices).toHaveLength(3);});
  it('restricts group submission to its leader',()=>expect(applyCommand(fixture(),'s2',submit,now).ok).toBe(false));
  it('retains the first timestamp when editing a submitted EOI',()=>{const s=submitted();const r=applyCommand(s,'s1',{...submit,choices:choices.map(x=>({...x,approach:'Updated plan'}))},new Date('2026-10-10T00:00:00Z'));expect(r.ok).toBe(true);if(r.ok){expect(r.value.eois).toHaveLength(1);expect(r.value.eois[0].firstSubmittedAt).toBe('2026-10-09T01:00:00.000Z');expect(r.value.eois[0].lastEditedAt).toBe('2026-10-10T00:00:00.000Z');}});
});
describe('membership',()=>{
  it('preserves the submitted membership snapshot and denies staff replacement',()=>{const s=submitted();const before=structuredClone(s.groups[0].memberIds);const r=applyCommand(s,'c',{type:'correctMembers',groupId:'g',memberIds:['s1','s2','s4'],reason:'Requested change'},now);expect(r.ok).toBe(false);expect(s.groups[0].memberIds).toEqual(before);expect(s.eois[0].members?.map(m=>m.name)).toContain('Student Three');});
  it('rejects accepting a fifth member even with a pending invitation',()=>{const s=fixture();s.groups[0].memberIds.push('s4');s.groups[0].invitations.push({userId:'s5',status:'pending'});expect(applyCommand(s,'s5',{type:'acceptInvite',groupId:'g'},now).ok).toBe(false);});
  it('rejects joining two groups in a cycle',()=>{const s=fixture();s.groups.push({id:'g2',name:'Other',leaderId:'s4',cycleId:'cycle',memberIds:['s4'],invitations:[{userId:'s1',status:'pending'}]});expect(applyCommand(s,'s1',{type:'acceptInvite',groupId:'g2'},now).ok).toBe(false);});
  it('locks membership after submission',()=>{const s=submitted();expect(applyCommand(s,'s1',{type:'invite',groupId:'g',userId:'s4'},now).ok).toBe(false);});
  it('does not record an unauthorised membership replacement',()=>{const s=fixture();expect(applyCommand(s,'c',{type:'correctMembers',groupId:'g',memberIds:['s1','s2','s4'],reason:'Requested'},now).ok).toBe(false);expect(s.history).toHaveLength(0);});
});
describe('convenor allocation',()=>{
  const allocate:Command={type:'allocate',groupId:'g',projectId:'p1',rationale:'Strong relevant skills.'};
  it('allocates one project and records the convenor decision',()=>{const r=applyCommand(submitted(),'c',allocate,now);expect(r.ok).toBe(true);if(r.ok){expect(r.value.allocations[0].projectId).toBe('p1');expect(r.value.projects[0].status).toBe('allocated');expect(r.value.eois[0].status).toBe('allocated');}});
  it('rejects assigning another project to an allocated group',()=>{const a=applyCommand(submitted(),'c',allocate,now);if(!a.ok)throw Error(a.message);expect(applyCommand(a.value,'c',{...allocate,projectId:'p2'},now).ok).toBe(false);});
  it('rejects duplicate assignment of the project to another group',()=>{const a=applyCommand(submitted(),'c',allocate,now);if(!a.ok)throw Error(a.message);a.value.groups.push({id:'g2',name:'Other',cycleId:'cycle',leaderId:'s4',memberIds:['s4'],invitations:[]});expect(applyCommand(a.value,'c',{...allocate,groupId:'g2'},now).ok).toBe(false);});
  it('does not allow sponsors to allocate projects',()=>expect(applyCommand(submitted(),'sp',allocate,now).ok).toBe(false));
  it('rejects new EOIs from an allocated group',()=>{const a=applyCommand(submitted(),'c',allocate,now);if(!a.ok)throw Error(a.message);expect(applyCommand(a.value,'s1',submit,now).ok).toBe(false);});
  it('retains an unsuccessful EOI across the next application round',()=>{const s=submitted();const rejected=applyCommand(s,'c',{type:'rejectEOI',eoiId:s.eois[0].id,reason:'Skills fit other available projects.'},now);if(!rejected.ok)throw Error(rejected.message);rejected.value.rounds[0].status='closed';rejected.value.rounds.push({...s.rounds[0],id:'r2',sequence:2});const r=applyCommand(rejected.value,'s1',{...submit,roundId:'r2'},now);expect(r.ok).toBe(true);if(r.ok){expect(r.value.eois).toHaveLength(2);expect(r.value.eois[0].status).toBe('unsuccessful');}});
});
describe('record permissions',()=>{
  function allocated(){const r=applyCommand(submitted(),'c',{type:'allocate',groupId:'g',projectId:'p1',rationale:'Skills fit'},now);if(!r.ok)throw Error(r.message);return r.value;}
  it('hides internal messages and EOIs from sponsors',()=>{const s=allocated();s.records=[{id:'internal',projectId:'p1',authorId:'s1',type:'message',visibility:'team',body:'Private team discussion',createdAt:now.toISOString()}];const v=visibleState(s,'sp');expect(v.eois).toHaveLength(0);expect(v.records).toHaveLength(0);});
  it('hides another sponsor’s projects',()=>expect(visibleState(allocated(),'sp2').projects).toHaveLength(0));
  it('blocks sponsors from posting internal messages',()=>expect(applyCommand(allocated(),'sp',{type:'postRecord',projectId:'p1',recordType:'message',visibility:'team',body:'Hello'},now).ok).toBe(false));
  it('blocks javascript deliverable links',()=>expect(applyCommand(allocated(),'s1',{type:'postRecord',projectId:'p1',recordType:'deliverable',visibility:'shared',body:'Demo',url:'javascript:alert(1)'},now).ok).toBe(false));
  it('allows shared sponsor feedback only for its own project',()=>{expect(applyCommand(allocated(),'sp',{type:'postRecord',projectId:'p1',recordType:'message',visibility:'shared',body:'Please include an accessible prototype.'},now).ok).toBe(true);expect(applyCommand(allocated(),'sp2',{type:'postRecord',projectId:'p1',recordType:'message',visibility:'shared',body:'Hello'},now).ok).toBe(false);});
});
