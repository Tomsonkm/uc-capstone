import {it,expect} from 'vitest';
import {createSeed} from '../services/seed';
import {applyCommand,visibleState} from './workflow';
import type {AppState,Command} from './types';
const now=new Date('2026-10-27T08:00:00Z');
it('only convenors can forward and only active sponsor accounts can receive an EOI',()=>{
 const s=createSeed(now),command={type:'forwardEOI' as const,eoiId:'eoi-2',projectId:'project-1'};
 for(const actor of ['student-1','mentor-1','sponsor-1'])expect(applyCommand(s,actor,command,now).ok).toBe(false);
 s.users.find(u=>u.id==='sponsor-1')!.active=false;expect(applyCommand(s,'coordinator-1',command,now).ok).toBe(false);
});
it('the owning sponsor receives the forwarded group name and notification before allocation',()=>{
 const s=run(createSeed(now),'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'}),view=visibleState(s,'sponsor-1');
 const group=s.groups.find(g=>g.id===s.eois.find(e=>e.id==='eoi-2')!.groupId)!;
 expect(view.groups.find(g=>g.id===group.id)?.name).toBe(group.name);expect(view.notifications!.some(n=>n.href==='decisions')).toBe(true);
 expect(view.groups.find(g=>g.id===group.id)?.memberIds).toEqual([]);
 const newcomer={id:'new-private-member',name:'Private new member',role:'student' as const,skills:[]};s.users.push(newcomer);group.memberIds.push(newcomer.id);
 expect(visibleState(s,'sponsor-1').users.some(u=>u.id===newcomer.id)).toBe(false);
 expect(visibleState(s,'sponsor-2').sponsorDecisions).toHaveLength(0);
});
function run(s:AppState,actor:string,c:Command){const r=applyCommand(s,actor,c,now);if(!r.ok)throw Error(r.message);return r.value;}
const proposal={type:'saveProposal' as const,title:'Accessible booking',brief:'Build an accessible community booking website.',category:'Web development',skills:['React'],outcomes:['Tested application'],submit:true};
it('a sponsor proposal stays private until convenor approval and explicit publication',()=>{
 let s=run(createSeed(now),'sponsor-1',proposal);const p=s.proposals![0];expect(p.status).toBe('pending');
 expect(visibleState(s,'sponsor-2').proposals).toHaveLength(0);expect(visibleState(s,'student-1').proposals).toHaveLength(0);
 expect(applyCommand(s,'mentor-1',{type:'reviewProposal',proposalId:p.id,decision:'approved',reason:'Suitable'},now).ok).toBe(false);
 s=run(s,'coordinator-1',{type:'reviewProposal',proposalId:p.id,decision:'approved',reason:'Suitable scope'});
 expect(s.projects.some(x=>x.title===p.title)).toBe(false);
 s=run(s,'coordinator-1',{type:'publishProposal',proposalId:p.id});expect(s.projects.find(x=>x.title===p.title)?.status).toBe('published');
 expect(s.notifications!.some(n=>n.userId==='sponsor-1')).toBe(true);
});
it('another sponsor cannot alter a proposal and requested changes keep history',()=>{
 let s=run(createSeed(now),'sponsor-1',proposal);const p=s.proposals![0];
 expect(applyCommand(s,'sponsor-2',{type:'withdrawProposal',proposalId:p.id},now).ok).toBe(false);
 s=run(s,'coordinator-1',{type:'reviewProposal',proposalId:p.id,decision:'changes_requested',reason:'Narrow scope'});
 s=run(s,'sponsor-1',{...proposal,proposalId:p.id,title:'Revised booking'});expect(s.proposals![0].version).toBe(2);expect(s.proposals![0].history.length).toBe(3);
});
it('forwarding exposes only the selected project choice to the correct sponsor',()=>{
 let s=createSeed(now);s=run(s,'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});
 expect(visibleState(s,'sponsor-1').eois[0].choices).toHaveLength(1);expect(visibleState(s,'sponsor-2').eois).toHaveLength(0);
 const d=s.sponsorDecisions![0];expect(applyCommand(s,'sponsor-2',{type:'sponsorDecision',decisionId:d.id,decision:'accepted',reason:'Good fit'},now).ok).toBe(false);
 s=run(s,'sponsor-1',{type:'sponsorDecision',decisionId:d.id,decision:'accepted',reason:'Good fit'});expect(s.sponsorDecisions![0].status).toBe('accepted');
});
it('allocation review is separate from confirmation and prevents duplicate assignment',()=>{
 let s=createSeed(now);s=run(s,'coordinator-1',{type:'reviewEOI',eoiId:'eoi-2',decision:'approved',reason:'Suitable skills'});
 s=run(s,'mentor-1',{type:'expressInterest',capacity:3,statement:'Available to guide web projects.'});
 s=run(s,'coordinator-1',{type:'saveAllocationDraft',groupId:'team-2',projectId:'project-1',mentorId:'mentor-1',rationale:'Skills and preference align'});
 expect(s.allocations.some(a=>a.groupId==='team-2')).toBe(false);const draft=s.allocationDrafts![0];
 s=run(s,'coordinator-1',{type:'confirmAllocation',draftId:draft.id});expect(s.allocations.some(a=>a.groupId==='team-2'&&a.mentorId==='mentor-1')).toBe(true);
 expect(applyCommand(s,'coordinator-1',{type:'confirmAllocation',draftId:draft.id},now).ok).toBe(false);
 expect(s.channels!.some(c=>c.kind==='shared'&&c.projectId==='project-1')).toBe(true);
});
it('private team messages are hidden from convenors and unrelated sponsors',()=>{
 let s=run(createSeed(now),'student-9',{type:'createChannel',kind:'team',targetId:'team-3'});const ch=s.channels![0];
 s=run(s,'student-9',{type:'sendMessage',channelId:ch.id,body:'Private team discussion'});
 expect(visibleState(s,'student-10').messages).toHaveLength(1);expect(visibleState(s,'coordinator-1').messages).toHaveLength(0);
 expect(applyCommand(s,'sponsor-2',{type:'sendMessage',channelId:ch.id,body:'Not a member'},now).ok).toBe(false);
});
it('tutors can express interest and contact convenors without allocation powers',()=>{
 let s=createSeed(now);s.users.push({id:'tutor-test',name:'Tutor Test',role:'tutor',skills:[]});
 s=run(s,'tutor-test',{type:'expressInterest',capacity:2,statement:'Available for tutorials'});expect(s.interests![0].kind).toBe('tutor');
 s=run(s,'tutor-test',{type:'createChannel',kind:'tutor-convenor',targetId:'coordinator-1'});expect(s.channels![0].memberIds).toContain('coordinator-1');
 expect(visibleState(s,'tutor-test').projects).toHaveLength(0);
});
it('an unknown mutation cannot return a false successful result',()=>{
 expect(applyCommand(createSeed(now),'coordinator-1',{type:'notACommand'} as unknown as Command,now).ok).toBe(false);
});
it('former sponsors lose forwarded application access when project ownership changes',()=>{
 let s=run(createSeed(now),'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});const d=s.sponsorDecisions![0];
 s=run(s,'coordinator-1',{type:'linkSponsor',projectId:'project-1',sponsorId:'sponsor-2',reason:'Confirmed ownership correction'});
 expect(visibleState(s,'sponsor-1').eois).toHaveLength(0);
 expect(applyCommand(s,'sponsor-1',{type:'sponsorDecision',decisionId:d.id,decision:'accepted',reason:'Late response'},now).ok).toBe(false);
});
it('a new sponsor can receive a fresh forward and must provide their own acceptance',()=>{
 let s=run(createSeed(now),'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});s=run(s,'sponsor-1',{type:'sponsorDecision',decisionId:s.sponsorDecisions![0].id,decision:'accepted',reason:'Original owner approval'});
 s=run(s,'coordinator-1',{type:'linkSponsor',projectId:'project-1',sponsorId:'sponsor-2',reason:'New sponsor owns the project'});
 expect(s.sponsorDecisions![0].status).toBe('superseded');s=run(s,'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});expect(s.sponsorDecisions!.at(-1)?.sponsorId).toBe('sponsor-2');
 s=run(s,'coordinator-1',{type:'reviewEOI',eoiId:'eoi-2',decision:'approved',reason:'Ready except sponsor review'});s=run(s,'mentor-1',{type:'expressInterest',capacity:3,statement:'Available'});s=run(s,'coordinator-1',{type:'saveAllocationDraft',groupId:'team-2',projectId:'project-1',mentorId:'mentor-1',rationale:'Review pending'});expect(applyCommand(s,'coordinator-1',{type:'confirmAllocation',draftId:s.allocationDrafts![0].id},now).ok).toBe(false);
});
it('a sponsor cannot change an EOI after a final convenor rejection',()=>{
 let s=run(createSeed(now),'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});const d=s.sponsorDecisions![0];s=run(s,'coordinator-1',{type:'reviewEOI',eoiId:'eoi-2',decision:'unsuccessful',reason:'Different requirements'});
 expect(applyCommand(s,'sponsor-1',{type:'sponsorDecision',decisionId:d.id,decision:'accepted',reason:'Late'},now).ok).toBe(false);
});
it('a forward preserves its original submission rather than leaking a new revision',()=>{
 let s=run(createSeed(now),'coordinator-1',{type:'forwardEOI',eoiId:'eoi-2',projectId:'project-1'});const original=s.eois[0].choices[0].approach;
 s=run(s,'student-6',{type:'submitEOI',groupId:'team-2',roundId:'round-1',choices:s.eois[0].choices.map(c=>({...c,approach:'A new plan not yet forwarded'}))});
 expect(visibleState(s,'sponsor-1').eois[0].choices[0].approach).toBe(original);
});
it('confirmation rechecks staff eligibility and retains a chosen tutor',()=>{
 let s=run(createSeed(now),'coordinator-1',{type:'reviewEOI',eoiId:'eoi-2',decision:'approved',reason:'Good fit'});s.users.push({id:'tutor-test',name:'Tutor',role:'tutor',skills:[]});
 s=run(s,'mentor-1',{type:'expressInterest',capacity:4,statement:'Available'});s=run(s,'coordinator-1',{type:'saveAllocationDraft',groupId:'team-2',projectId:'project-1',mentorId:'mentor-1',tutorId:'tutor-test',rationale:'Good match'});const d=s.allocationDrafts![0];
 const inactive=structuredClone(s);inactive.users.find(u=>u.id==='mentor-1')!.active=false;expect(applyCommand(inactive,'coordinator-1',{type:'confirmAllocation',draftId:d.id},now).ok).toBe(false);
 const result=run(s,'coordinator-1',{type:'confirmAllocation',draftId:d.id});expect(result.allocations.find(a=>a.groupId==='team-2')?.tutorId).toBe('tutor-test');
});
