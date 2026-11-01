import type {AppState,EOIChoice} from '../domain/types';
import {safeURL} from '../domain/workflow';
const text=(v:unknown):v is string=>typeof v==='string';
const nonempty=(v:unknown)=>text(v)&&!!v.trim();
const texts=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(text);
const time=(v:unknown)=>text(v)&&Number.isFinite(Date.parse(v));
function requireValue(valid:unknown){if(!valid)throw Error('Malformed saved demonstration data');}
export function validateState(value:unknown):AppState{
 const s=value as AppState;
 requireValue(s?.version===1&&['users','groups','projects','rounds','eois','allocations','records','history'].every(k=>Array.isArray(s[k as keyof AppState])));
 requireValue(s.users.length>0&&s.rounds.length>0);
 for(const list of [s.users,s.groups,s.projects,s.rounds,s.eois,s.allocations,s.records])requireValue(list.every(x=>x&&nonempty(x.id))&&new Set(list.map(x=>x.id)).size===list.length);
 const user=(id:string)=>s.users.find(u=>u.id===id),group=(id:string)=>s.groups.find(g=>g.id===id),project=(id:string)=>s.projects.find(p=>p.id===id),round=(id:string)=>s.rounds.find(r=>r.id===id);
 for(const u of s.users)requireValue(nonempty(u.name)&&['student','mentor','coordinator','sponsor','tutor'].includes(u.role)&&texts(u.skills)&&(!u.portfolio||safeURL(u.portfolio)));
 const membership=new Set<string>();
 for(const g of s.groups){
  requireValue(nonempty(g.name)&&nonempty(g.cycleId)&&texts(g.memberIds)&&g.memberIds.length>=1&&g.memberIds.length<=4&&new Set(g.memberIds).size===g.memberIds.length&&g.memberIds.includes(g.leaderId)&&Array.isArray(g.invitations));
  for(const id of g.memberIds){requireValue(user(id)?.role==='student'&&!membership.has(`${g.cycleId}:${id}`));membership.add(`${g.cycleId}:${id}`);}
  for(const i of g.invitations)requireValue(user(i.userId)?.role==='student'&&['pending','accepted'].includes(i.status));
 }
 for(const p of s.projects)requireValue(nonempty(p.title)&&text(p.category)&&text(p.sponsor)&&text(p.brief)&&text(p.art)&&nonempty(p.cycleId)&&texts(p.skills)&&texts(p.outcomes)&&['draft','published','allocated','closed'].includes(p.status)&&((p.source==='uc-s2-2026-v1'&&p.id.startsWith('uc-s2-2026-')&&nonempty(p.code)&&Number.isInteger(p.sourcePage)&&Number(p.sourcePage)>0&&Number(p.sourcePage)<=48&&text(p.scope)&&text(p.requirements)&&(p.sponsorId===''||user(p.sponsorId)?.role==='sponsor')&&(p.mentorId===''||user(p.mentorId)?.role==='mentor'))||(user(p.sponsorId)?.role==='sponsor'&&(p.mentorId===''||user(p.mentorId)?.role==='mentor'))));
 for(const p of s.projects){
  requireValue(['code','scope','requirements','sourceNote'].every(k=>p[k as keyof typeof p]===undefined||text(p[k as keyof typeof p])));
  requireValue(p.catalogueArchive===undefined||typeof p.catalogueArchive==='boolean');
  requireValue(p.source===undefined||p.source==='uc-s2-2026-v1');
 }
 for(const r of s.rounds)requireValue(nonempty(r.cycleId)&&Number.isInteger(r.sequence)&&r.sequence>0&&['open','closed'].includes(r.status)&&time(r.opensAt)&&time(r.closesAt)&&Date.parse(r.opensAt)<Date.parse(r.closesAt));
 function choicesValid(choices:EOIChoice[]){return Array.isArray(choices)&&choices.length<=3&&new Set(choices.map(c=>c.projectId)).size===choices.length&&choices.every((c,i)=>c&&!!project(c.projectId)&&c.rank===i+1&&text(c.suitability)&&text(c.approach));}
 const membersValid=(members:{name:string;skills:string[]}[])=>Array.isArray(members)&&members.every(m=>m&&nonempty(m.name)&&texts(m.skills));
 for(const e of s.eois)requireValue(!!group(e.groupId)&&!!round(e.roundId)&&choicesValid(e.choices)&&(!e.draftChoices||choicesValid(e.draftChoices))&&['draft','submitted','under_review','awaiting_sponsor','approved','unsuccessful','allocated'].includes(e.status)&&(!e.firstSubmittedAt||time(e.firstSubmittedAt))&&(e.status==='draft'||time(e.firstSubmittedAt))&&(!e.lastEditedAt||time(e.lastEditedAt))&&(!e.draftEditedAt||time(e.draftEditedAt))&&(!e.members||membersValid(e.members))&&Array.isArray(e.history)&&e.history.every(h=>h&&time(h.at)&&text(h.body))&&(!e.corrections||Array.isArray(e.corrections)&&e.corrections.every(c=>time(c.at)&&nonempty(c.reason)&&membersValid(c.members))));
 requireValue(new Set(s.eois.map(e=>`${e.groupId}:${e.roundId}`)).size===s.eois.length);
 requireValue(new Set(s.allocations.map(a=>a.projectId)).size===s.allocations.length&&new Set(s.allocations.map(a=>a.groupId)).size===s.allocations.length);
 for(const a of s.allocations)requireValue(!!group(a.groupId)&&project(a.projectId)?.status==='allocated'&&['mentor','coordinator'].includes(user(a.mentorId)?.role||'')&&time(a.createdAt)&&text(a.rationale));
 for(const r of s.records){
  requireValue(!!project(r.projectId)&&!!user(r.authorId)&&['update','message','meeting','deliverable','review'].includes(r.type)&&['team','shared','mentor'].includes(r.visibility)&&time(r.createdAt)&&text(r.body)&&(!r.title||text(r.title))&&(!r.next||text(r.next))&&(!r.blockers||text(r.blockers))&&(!r.url||safeURL(r.url)));
  if(r.type==='meeting')requireValue(time(r.meetingAt)&&['pending','confirmed','declined','cancelled'].includes(r.status||''));
  if(r.type==='deliverable')requireValue(!!r.url&&safeURL(r.url)&&Number.isInteger(r.version)&&Number(r.version)>0&&['Submitted','Under review','Changes requested','Review complete'].includes(r.status||''));
  if(r.type==='review')requireValue(s.records.some(parent=>parent.id===r.parentId&&parent.type==='deliverable'&&parent.projectId===r.projectId)&&['Under review','Changes requested','Review complete'].includes(r.status||''));
 }
 for(const h of s.history)requireValue(h&&time(h.at)&&text(h.body));
 return s;
}
