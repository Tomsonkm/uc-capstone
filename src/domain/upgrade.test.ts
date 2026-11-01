import {it,expect} from 'vitest';
import {createSeed} from '../services/seed';
import {applyCommand,visibleState} from './workflow';
const now=new Date('2026-10-27T08:00:00Z');
it('only the convenor can decide EOIs and allocations',()=>{
 const s=createSeed(now);
 expect(applyCommand(s,'mentor-1',{type:'rejectEOI',eoiId:'eoi-2',reason:'Test'},now).ok).toBe(false);
 expect(applyCommand(s,'mentor-1',{type:'allocate',groupId:'team-2',projectId:'project-1',rationale:'Test'},now).ok).toBe(false);
});
it('rejects convenor membership replacement',()=>{
 expect(applyCommand(createSeed(now),'coordinator-1',{type:'correctMembers',groupId:'team-1',memberIds:['student-1','student-2','student-4'],reason:'Test'},now).ok).toBe(false);
});
it('never exposes another sponsor attributed project to a sample sponsor account',()=>{
 const s=visibleState(createSeed(now),'sponsor-1');
 expect(s.projects.some(p=>p.sponsor==='Northstar Health')).toBe(false);
});
it('a sponsor cannot update a private student-team meeting even with its ID',()=>{
 const s=createSeed(now);s.records.push({id:'private-meeting',projectId:'project-8',authorId:'student-9',type:'meeting',visibility:'team',body:'Private meeting',createdAt:now.toISOString(),meetingAt:'2026-10-28T10:00:00Z',status:'pending'});
 expect(applyCommand(s,'sponsor-2',{type:'updateMeeting',recordId:'private-meeting',status:'confirmed'},now).ok).toBe(false);
 expect(applyCommand(s,'coordinator-1',{type:'updateMeeting',recordId:'private-meeting',status:'cancelled'},now).ok).toBe(false);
});
