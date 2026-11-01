import type {AppState,Command,Result,User,Project,EOI,EOIVersion} from './types';
import type {Channel,PlatformCommand} from './platformTypes';
const types=new Set(['saveProposal','reviewProposal','withdrawProposal','publishProposal','deleteProposal','closeProject','linkSponsor','reviewEOI','forwardEOI','sponsorDecision','saveAllocationDraft','confirmAllocation','expressInterest','reviewInterest','deadlineException','sendMessage','markRead','createChannel','saveTask','completeTask','solicitProposal','registerDocument','reopenEOI']);
export function submissionSnapshot(e:EOI):EOIVersion{return structuredClone({version:e.version||1,at:e.lastEditedAt||e.firstSubmittedAt||new Date().toISOString(),choices:e.choices,members:e.members,unitCode:e.unitCode,contactName:e.contactName,contactEmail:e.contactEmail});}
export function preserveSubmission(e:EOI){e.versions??=[];if(!e.versions.some(v=>v.version===(e.version||1)))e.versions.push(submissionSnapshot(e));}
export function hydratePlatform(s:AppState):AppState{
 for(const key of ['proposals','interests','notifications','channels','messages','documents','tasks','exceptions','allocationDrafts','sponsorDecisions','audit'] as const)s[key]??=[];
 return s;
}
export function channelMembers(s:AppState,c:Channel):string[]{
 const convenors=s.users.filter(u=>u.role==='coordinator'&&u.active!==false).map(u=>u.id),g=s.groups.find(g=>g.id===c.groupId),p=s.projects.find(p=>p.id===c.projectId),a=s.allocations.find(a=>a.projectId===c.projectId),group=g||s.groups.find(g=>g.id===a?.groupId),students=group?.memberIds||[];
 const ids=c.kind==='team'?students:c.kind==='shared'?[...students,p?.mentorId,p?.sponsorId]:c.kind==='student-mentor'?[...students,p?.mentorId]:c.kind==='student-sponsor'?[...students,p?.sponsorId]:c.memberIds;
 return [...new Set(ids.filter((id):id is string=>!!id&&s.users.some(u=>u.id===id&&u.active!==false)&&(!c.projectId||!convenors.includes(id))))];
}
export function canReadChannel(s:AppState,userId:string,c:Channel){return channelMembers(s,c).includes(userId);}
export function filterPlatform(original:AppState,view:AppState,u:User):AppState{
 const s=hydratePlatform(view),convenor=u.role==='coordinator',ownGroup=original.groups.find(g=>g.memberIds.includes(u.id));
 s.proposals=s.proposals!.filter(p=>convenor||p.sponsorId===u.id);
 s.interests=s.interests!.filter(i=>convenor||i.userId===u.id);
 s.notifications=s.notifications!.filter(n=>n.userId===u.id);
 s.channels=s.channels!.filter(c=>canReadChannel(original,u.id,c)).map(c=>({...c,memberIds:channelMembers(original,c)}));
 const channelIds=new Set(s.channels.map(c=>c.id));s.messages=s.messages!.filter(m=>channelIds.has(m.channelId));s.documents=s.documents!.filter(d=>!['coordinator','tutor'].includes(u.role)&&channelIds.has(d.channelId));
 s.sponsorDecisions=s.sponsorDecisions!.filter(d=>convenor||(d.sponsorId===u.id&&original.projects.some(p=>p.id===d.projectId&&p.sponsorId===u.id)));
 s.allocationDrafts=convenor?s.allocationDrafts:[];s.exceptions=s.exceptions!.filter(e=>convenor||e.groupId===ownGroup?.id);s.audit=convenor?s.audit:[];
 s.tasks=s.tasks!.filter(t=>!['coordinator','tutor'].includes(u.role)&&(s.allocations.some(a=>a.projectId===t.projectId)||t.assigneeId===u.id));
 if(u.role==='sponsor'){
  const forwardedGroupIds=new Set(s.sponsorDecisions!.map(d=>original.eois.find(e=>e.id===d.eoiId)?.groupId));
  for(const group of original.groups.filter(g=>forwardedGroupIds.has(g.id)&&!s.groups.some(x=>x.id===g.id)))s.groups.push({id:group.id,name:group.name,cycleId:group.cycleId,leaderId:'',memberIds:[],invitations:[]});
  const forwarded=(s.sponsorDecisions||[]);s.eois=forwarded.flatMap(d=>{const e=original.eois.find(e=>e.id===d.eoiId);if(!e)return [];const application=d.application||((e.version||1)===d.eoiVersion?submissionSnapshot(e):undefined);if(!application)return [];return [{id:e.id,groupId:e.groupId,roundId:e.roundId,...application,status:e.status,firstSubmittedAt:application.at,lastEditedAt:application.at,choices:application.choices.filter(c=>c.projectId===d.projectId),history:[]}];});
 }
 if(u.role==='tutor'){s.eois=[];s.groups=[];s.allocations=original.allocations.filter(a=>a.tutorId===u.id);s.projects=original.projects.filter(p=>s.allocations.some(a=>a.projectId===p.id));s.records=[];}
 const relevantIds=new Set([u.id,...s.groups.flatMap(g=>g.memberIds),...s.channels.flatMap(c=>c.memberIds),...s.projects.flatMap(p=>[p.sponsorId,p.mentorId])]);
 if(!convenor&&u.role!=='student')s.users=original.users.filter(user=>relevantIds.has(user.id)||user.role==='coordinator');
 return s;
}
export function applyPlatformCommand(input:AppState,actorId:string,command:Command,now:Date):Result<AppState>|undefined{
 if(!types.has(command.type))return undefined;
 const c=command as PlatformCommand,s=hydratePlatform(structuredClone(input)),u=s.users.find(u=>u.id===actorId&&u.active!==false),at=now.toISOString(),id=()=>crypto.randomUUID();
 const fail=(message:string,code='invalid'):Result<AppState>=>({ok:false,code,message});if(!u)return fail('Sign in with an active account.','permission');
 const convenor=u.role==='coordinator',note=(ids:string[],body:string,href:string)=>{for(const userId of new Set(ids.filter(Boolean)))s.notifications!.push({id:id(),userId,body,href,at,read:false});},admins=s.users.filter(u=>u.role==='coordinator').map(u=>u.id);
 const audit=(recordId:string,reason='')=>s.audit!.push({id:id(),actorId:u.id,action:c.type,recordId,reason,at});
 const groupMembers=(gid:string)=>s.groups.find(g=>g.id===gid)?.memberIds||[];
 const visibleProject=(p:Project)=>(u.role==='mentor'&&p.mentorId===u.id)||(u.role==='sponsor'&&p.sponsorId===u.id)||(u.role==='student'&&s.allocations.some(a=>a.projectId===p.id&&groupMembers(a.groupId).includes(u.id)));
 if(c.type==='saveProposal'){
  if(u.role!=='sponsor')return fail('Only sponsors submit their own proposals.','permission');
  let p=s.proposals!.find(p=>p.id===c.proposalId);
  if(c.proposalId&&(!p||p.sponsorId!==u.id))return fail('Proposal unavailable.','permission');
  if(p?.projectId)return fail('A published proposal must be revised through the convenor.');
  if(!c.title.trim()||!c.brief.trim()||!c.skills.length||!c.outcomes.length)return fail('Provide a title, description, required skills and deliverables.');
  if(!p){p={id:id(),sponsorId:u.id,title:'',brief:'',category:'',skills:[],outcomes:[],status:'draft',version:0,history:[]};s.proposals!.push(p);}
  Object.assign(p,{title:c.title.trim(),brief:c.brief.trim(),category:c.category,skills:c.skills.map(x=>x.trim()).filter(Boolean),outcomes:c.outcomes.map(x=>x.trim()).filter(Boolean),status:c.submit?'pending':'draft',version:p.version+1});
  p.history.push({at,body:c.submit?'Proposal submitted for convenor approval':'Draft saved'});audit(p.id);
  if(c.submit)note(admins,`Proposal awaiting review: ${p.title}`,'proposals');
 }else if(c.type==='reviewProposal'){
  const p=s.proposals!.find(p=>p.id===c.proposalId);if(!convenor||!p)return fail('Only the convenor reviews proposals.','permission');
  if(!['pending','changes_requested'].includes(p.status)||!c.reason.trim())return fail('Choose a pending proposal and record a reason.');
  p.status=c.decision;p.history.push({at,body:`${c.decision.replaceAll('_',' ')}: ${c.reason.trim()}`});audit(p.id,c.reason);note([p.sponsorId],`Proposal ${p.status.replaceAll('_',' ')}: ${p.title}`,'proposals');
 }else if(c.type==='publishProposal'){
  const p=s.proposals!.find(p=>p.id===c.proposalId);if(!convenor||!p||p.status!=='approved'||p.projectId)return fail('Only an approved, unpublished proposal can be published.');
  p.projectId=`proposal-${p.id}`;s.projects.push({id:p.projectId,title:p.title,brief:p.brief,category:p.category,skills:p.skills,outcomes:p.outcomes,sponsorId:p.sponsorId,sponsor:s.users.find(u=>u.id===p.sponsorId)?.company||s.users.find(u=>u.id===p.sponsorId)?.name||'',mentorId:'',status:'published',art:'city',cycleId:s.rounds.at(-1)?.cycleId||'cycle'});p.history.push({at,body:'Published for students'});audit(p.id);note([p.sponsorId],`Your project is now available: ${p.title}`,'projects');
 }else if(c.type==='withdrawProposal'||c.type==='deleteProposal'){
  const p=s.proposals!.find(p=>p.id===c.proposalId);if(!p||p.sponsorId!==u.id)return fail('Only the owning sponsor can change this proposal.','permission');
  if(p.projectId)return fail('Contact the convenor to close a published project.');
  if(c.type==='deleteProposal'){if(p.status!=='draft')return fail('Only unused drafts can be deleted. Withdraw a submitted proposal.');s.proposals=s.proposals!.filter(x=>x.id!==p.id);}else{p.status='withdrawn';p.history.push({at,body:'Withdrawn by sponsor'});}audit(p.id);
 }else if(c.type==='closeProject'||c.type==='linkSponsor'){
  const p=s.projects.find(p=>p.id===c.projectId);if(!convenor||!p||!c.reason.trim())return fail('A convenor and a recorded reason are required.','permission');
  if(c.type==='closeProject'){if(p.status==='allocated')return fail('An allocated project cannot be closed without reviewing its allocation.');p.status='closed';}
  else{const sponsor=s.users.find(x=>x.id===c.sponsorId&&x.role==='sponsor'&&x.active!==false);if(!sponsor)return fail('Select an active sponsor account.');p.sponsorId=sponsor.id;for(const d of s.sponsorDecisions!.filter(d=>d.projectId===p.id&&d.sponsorId!==sponsor.id&&d.status!=='superseded')){d.status='superseded';d.reason='Project ownership changed. A new forward is required.';}}
  audit(p.id,c.reason);
 }else if(c.type==='reviewEOI'||c.type==='reopenEOI'){
  const e=s.eois.find(e=>e.id===c.eoiId);if(!convenor||!e||!c.reason.trim()||e.status==='allocated')return fail('Select an application and provide a convenor decision reason.','permission');
  preserveSubmission(e);
  if(c.type==='reopenEOI'){if(e.status!=='unsuccessful')return fail('Only a rejected application can be reopened.');e.status='draft';e.history.push({at,body:`Resubmission permitted: ${c.reason}`});}
  else{if(e.status==='draft')return fail('The group has not submitted this application.');e.status=c.decision;e.reason=c.reason;e.history.push({at,body:`${c.decision==='unsuccessful'?'Rejected':c.decision.replaceAll('_',' ')}: ${c.reason}`});}
  if(e.status==='unsuccessful'){
   for(const d of s.sponsorDecisions!.filter(d=>d.eoiId===e.id&&d.status==='pending'))d.status='superseded';
   const expiresAt=new Date(Math.max(now.getTime()+72*60*60*1000,Date.parse(s.rounds.find(r=>r.id===e.roundId)?.closesAt||at))).toISOString();
   s.exceptions!.push({id:id(),groupId:e.groupId,roundId:e.roundId,expiresAt,reason:'Resubmission after rejection',authorId:u.id});
   e.history.push({at,body:`Resubmission permitted until ${expiresAt}. Choose available projects and submit revised preferences.`});
  }
  audit(e.id,c.reason);note(groupMembers(e.groupId),c.type==='reopenEOI'?'Your EOI may be resubmitted within the open deadline.':`EOI ${e.status==='unsuccessful'?'rejected':e.status.replaceAll('_',' ')}: ${c.reason}`,'preferences');
 }else if(c.type==='forwardEOI'){
  const e=s.eois.find(e=>e.id===c.eoiId),p=s.projects.find(p=>p.id===c.projectId);if(!convenor||!e||!p||!p.sponsorId||!e.choices.some(ch=>ch.projectId===p.id)||['draft','allocated','unsuccessful'].includes(e.status))return fail('Choose a submitted preference with a connected sponsor.');
  if(!s.users.some(user=>user.id===p.sponsorId&&user.role==='sponsor'&&user.active!==false))return fail('Link an active sponsor account to this project before forwarding its EOI.');
  if(s.sponsorDecisions!.some(d=>d.eoiId===e.id&&d.projectId===p.id&&d.sponsorId===p.sponsorId&&d.status!=='superseded'&&d.eoiVersion===(e.version||1)))return fail('This version has already been forwarded.');
  preserveSubmission(e);const application=submissionSnapshot(e);application.choices=application.choices.filter(ch=>ch.projectId===p.id);const d={id:id(),eoiId:e.id,projectId:p.id,sponsorId:p.sponsorId,eoiVersion:e.version||1,status:'pending' as const,reason:'',at,application};s.sponsorDecisions!.push(d);e.status='awaiting_sponsor';e.history.push({at,body:`Forwarded to sponsor: ${p.title}`});audit(e.id);note([p.sponsorId],`Please review a group application for ${p.title}`,'decisions');
 }else if(c.type==='sponsorDecision'){
  const d=s.sponsorDecisions!.find(d=>d.id===c.decisionId),e=s.eois.find(e=>e.id===d?.eoiId);if(u.role!=='sponsor'||!d||d.sponsorId!==u.id||!s.projects.some(p=>p.id===d.projectId&&p.sponsorId===u.id))return fail('This decision is for another sponsor.','permission');
  if(!e||['allocated','unsuccessful','draft'].includes(e.status)||d.eoiVersion!==(e.version||1)||d.status!=='pending'||!c.reason.trim())return fail('This review is outdated or already decided; a reason is required.');
  d.status=c.decision;d.reason=c.reason;d.at=at;e.status='under_review';e.history.push({at,body:`Sponsor ${c.decision}: ${c.reason}`});audit(d.id,c.reason);note(admins,`Sponsor ${c.decision} a forwarded EOI`,'allocation');
 }else if(c.type==='expressInterest'){
  if(!['mentor','tutor'].includes(u.role))return fail('Only mentors and tutors express staff interest.','permission');
  if(!Number.isInteger(c.capacity)||c.capacity<1||c.capacity>20||!c.statement.trim())return fail('Enter capacity from 1 to 20 and explain your interest.');
  const previous=s.interests!.find(i=>i.userId===u.id&&i.projectId===c.projectId);if(previous){previous.capacity=c.capacity;previous.statement=c.statement;previous.status='pending';previous.at=at;}else s.interests!.push({id:id(),userId:u.id,projectId:c.projectId,kind:u.role as 'mentor'|'tutor',capacity:c.capacity,statement:c.statement,status:'pending',at});audit(u.id);note(admins,`${u.name} expressed ${u.role} interest`,'interests');
 }else if(c.type==='reviewInterest'){
  const i=s.interests!.find(i=>i.id===c.interestId);if(!convenor||!i)return fail('Only the convenor reviews staff interest.','permission');i.status=c.decision;audit(i.id);note([i.userId],`Your ${i.kind} interest was ${c.decision}`,'interests');
 }else if(c.type==='saveAllocationDraft'){
  const e=s.eois.find(e=>e.groupId===c.groupId&&e.status==='approved'&&e.choices.some(ch=>ch.projectId===c.projectId)),p=s.projects.find(p=>p.id===c.projectId),mentor=s.users.find(m=>m.id===c.mentorId&&m.role==='mentor'&&m.active!==false);
  if(!convenor)return fail('Only the convenor allocates projects.','permission');if(!e||!p||p.status!=='published'||!mentor||!c.rationale.trim())return fail('Approve the EOI, choose an available project and mentor, and record a rationale.');
  if(c.tutorId&&!s.users.some(t=>t.id===c.tutorId&&t.role==='tutor'))return fail('Choose a valid tutor.');
  s.allocationDrafts=s.allocationDrafts!.filter(d=>d.groupId!==c.groupId);s.allocationDrafts.push({id:id(),groupId:c.groupId,projectId:p.id,mentorId:mentor.id,tutorId:c.tutorId,rationale:c.rationale,eoiId:e.id,eoiVersion:e.version||1,at});audit(e.id,c.rationale);
 }else if(c.type==='confirmAllocation'){
  if(!convenor)return fail('Only the convenor confirms allocations.','permission');const d=s.allocationDrafts!.find(d=>d.id===c.draftId),e=s.eois.find(e=>e.id===d?.eoiId),p=s.projects.find(p=>p.id===d?.projectId),g=s.groups.find(g=>g.id===d?.groupId);
  if(!d||!e||!p||!g||e.status!=='approved'||(e.version||1)!==d.eoiVersion||p.status!=='published'||g.memberIds.length<3||g.memberIds.length>4)return fail('The draft is outdated or the group/project is no longer eligible.','conflict');
  if(!s.users.some(u=>u.id===d.mentorId&&u.role==='mentor'&&u.active!==false)||(d.tutorId&&!s.users.some(u=>u.id===d.tutorId&&u.role==='tutor'&&u.active!==false)))return fail('The selected mentor or tutor is no longer eligible.','conflict');
  if(s.allocations.some(a=>a.projectId===p.id||a.groupId===g.id))return fail('The project or group already has an allocation.','conflict');
  const decisions=s.sponsorDecisions!.filter(x=>x.eoiId===e.id&&x.projectId===p.id);if(decisions.length&&!decisions.some(x=>x.eoiVersion===d.eoiVersion&&x.sponsorId===p.sponsorId&&x.status==='accepted'))return fail('A current sponsor acceptance is required.');
  const interest=s.interests!.find(i=>i.userId===d.mentorId&&i.status==='approved'&&(!i.projectId||i.projectId===p.id))||s.interests!.find(i=>i.userId===d.mentorId&&i.status==='pending'&&!i.projectId);
  if(!interest)return fail('The mentor must declare availability first.');if(s.allocations.filter(a=>a.mentorId===d.mentorId).length>=interest.capacity)return fail('The mentor has no remaining capacity.','conflict');
  const allocation={id:id(),groupId:g.id,projectId:p.id,mentorId:d.mentorId,tutorId:d.tutorId,createdAt:at,rationale:d.rationale};s.allocations.push(allocation);p.status='allocated';p.mentorId=d.mentorId;e.status='allocated';for(const response of s.sponsorDecisions!.filter(x=>x.eoiId===e.id&&x.status==='pending'))response.status='superseded';e.history.push({at,body:`Allocation confirmed: ${p.title}`});s.allocationDrafts=s.allocationDrafts!.filter(x=>x.id!==d.id);
  for(const kind of ['shared','student-mentor','student-sponsor'] as const){const ch:Channel={id:id(),kind,title:`${p.title} · ${kind.replaceAll('-',' ')}`,projectId:p.id,groupId:g.id,memberIds:[]};ch.memberIds=channelMembers(s,ch);s.channels!.push(ch);}
  note([...g.memberIds,p.sponsorId,d.mentorId],`Project allocated: ${p.title}`,'workspace');if(d.tutorId)note([d.tutorId],`Tutoring assignment: ${p.title}`,'overview');audit(allocation.id,d.rationale);
 }else if(c.type==='deadlineException'){
  if(!convenor||!s.groups.some(g=>g.id===c.groupId)||!s.rounds.some(r=>r.id===c.roundId)||!c.reason.trim()||!Number.isFinite(Date.parse(c.expiresAt))||new Date(c.expiresAt)<=now)return fail('Provide a group, round, future exception deadline and reason.');
  s.exceptions!.push({id:id(),...c,authorId:u.id});audit(c.groupId,c.reason);note(groupMembers(c.groupId),`An EOI deadline exception was granted until ${c.expiresAt}`,'preferences');
 }else if(c.type==='createChannel'){
  let members:string[]=[],title='',projectId:string|undefined,groupId:string|undefined;
  if(c.kind==='team'){const g=s.groups.find(g=>g.id===c.targetId&&g.memberIds.includes(u.id));if(!g)return fail('Only your group can open its private discussion.','permission');members=g.memberIds;groupId=g.id;title=`${g.name} · Team`;
  }else if(['mentor-convenor','tutor-convenor','sponsor-convenor'].includes(c.kind)){
   const role=c.kind.split('-')[0];const target=s.users.find(x=>x.id===c.targetId);if(convenor){if(target?.role!==role)return fail('Choose the relevant staff member.');members=[u.id,target.id];title=`${target.name} · Convenor`;}else{if(u.role!==role)return fail('This channel is for another role.','permission');members=[u.id,...admins];title=`${u.name} · Convenor`;}
  }else{const p=s.projects.find(p=>p.id===c.targetId);if(!p||!visibleProject(p)||!s.allocations.some(a=>a.projectId===p.id))return fail('Allocated project access is required.','permission');projectId=p.id;title=`${p.title} · ${c.kind}`;}
  if(s.channels!.some(x=>x.kind===c.kind&&(groupId?x.groupId===groupId:projectId?x.projectId===projectId:x.memberIds.includes(convenor?c.targetId:u.id))))return fail('This channel already exists.');
  const ch:Channel={id:id(),title,kind:c.kind,projectId,groupId,memberIds:members};ch.memberIds=channelMembers(s,ch);s.channels!.push(ch);audit(ch.id);
 }else if(c.type==='sendMessage'){
  const ch=s.channels!.find(ch=>ch.id===c.channelId);if(!ch||!canReadChannel(s,u.id,ch))return fail('You cannot access this conversation.','permission');if(!c.body.trim()||c.body.length>10000)return fail('Enter a message up to 10,000 characters.');
  s.messages!.push({id:id(),channelId:ch.id,authorId:u.id,body:c.body.trim(),at});note(channelMembers(s,ch).filter(x=>x!==u.id),`New message in ${ch.title}`,'messages');audit(ch.id);
 }else if(c.type==='registerDocument'){
  const ch=s.channels!.find(ch=>ch.id===c.document.channelId);if(!ch||!canReadChannel(s,u.id,ch))return fail('You cannot upload to this channel.','permission');
  const d=c.document;if(!d.title.trim()||!d.name.trim()||d.size<=0||d.size>20*1024*1024||!d.storageKey)return fail('A document title, valid file and storage key are required.');
  const previous=s.documents!.filter(x=>x.channelId===ch.id&&x.title===d.title);s.documents!.push({...d,id:id(),authorId:u.id,at,version:previous.length?Math.max(...previous.map(x=>x.version))+1:1});audit(ch.id);note(channelMembers(s,ch).filter(x=>x!==u.id),`Document updated: ${d.title}`,'documents');
 }else if(c.type==='saveTask'){
  const p=s.projects.find(p=>p.id===c.projectId);if(!p||!visibleProject(p)||!c.title.trim()||!Number.isFinite(Date.parse(c.dueAt)))return fail('Choose an accessible project and valid task/deadline.');
  const a=s.allocations.find(a=>a.projectId===p.id),allowed=[...(a?groupMembers(a.groupId):[]),p.mentorId,p.sponsorId];if(!allowed.includes(c.assigneeId))return fail('The assignee must belong to the project.');
  s.tasks!.push({id:id(),projectId:p.id,title:c.title,assigneeId:c.assigneeId,dueAt:c.dueAt,status:'open',authorId:u.id});note([c.assigneeId],`Task assigned: ${c.title}`,'workspace');audit(p.id);
 }else if(c.type==='completeTask'){
  const t=s.tasks!.find(t=>t.id===c.taskId);if(!t||convenor||t.assigneeId!==u.id)return fail('Only the assignee or convenor completes this task.','permission');t.status='done';audit(t.id);
 }else if(c.type==='markRead'){
  const n=s.notifications!.find(n=>n.id===c.notificationId&&n.userId===u.id);if(!n)return fail('Notification unavailable.','permission');n.read=true;
 }else if(c.type==='solicitProposal'){
  if(!convenor||!s.users.some(x=>x.id===c.sponsorId&&x.role==='sponsor')||!c.body.trim())return fail('Choose a sponsor and enter your request.');note([c.sponsorId],`Project proposal request: ${c.body}`,'proposals');audit(c.sponsorId,c.body);
 }
 return {ok:true,value:s};
}
