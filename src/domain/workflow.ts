import {applyPlatformCommand,filterPlatform,hydratePlatform,preserveSubmission} from './platformWorkflow';
import type {AppState,Command,EOIChoice,Result,User,Project} from './types';
const fail = (message:string,code='invalid'):Extract<Result<never>,{ok:false}> => ({ok:false,code,message});
const success = <T,>(value:T):Result<T> => ({ok:true,value});
export function availableProjects(s:AppState,cycleId:string):Project[]{return s.projects.filter(p=>p.cycleId===cycleId&&p.status==='published'&&!s.allocations.some(a=>a.projectId===p.id));}
export function groupFor(s:AppState,userId:string){return s.groups.find(g=>g.memberIds.includes(userId));}
export function availableStudents(s:AppState,groupId:string){
 const g=s.groups.find(g=>g.id===groupId),invited=new Set(g?.invitations.map(i=>i.userId)||[]),available=s.availableStudentIds?new Set(s.availableStudentIds):null;
 return s.users.filter(u=>u.role==='student'&&u.active!==false&&!groupFor(s,u.id)&&!invited.has(u.id)&&(!available||available.has(u.id))).sort((a,b)=>a.name.localeCompare(b.name));
}
export function projectAccess(s:AppState,u:User,p:Project){return (u.role==='sponsor'&&p.sponsorId===u.id)||(u.role==='mentor'&&p.mentorId===u.id)||(u.role==='student'&&s.allocations.some(a=>a.projectId===p.id&&s.groups.find(g=>g.id===a.groupId)?.memberIds.includes(u.id)));}
export function validateEOI(s:AppState,groupId:string,roundId:string,choices:EOIChoice[],now:Date):Result<EOIChoice[]>{
  const g=s.groups.find(g=>g.id===groupId),r=s.rounds.find(r=>r.id===roundId);
  if(!g||!r||g.cycleId!==r.cycleId)return fail('Group or application round could not be found.');
  if(g.memberIds.length<3||g.memberIds.length>4)return fail('Your group needs 3–4 accepted members before applying.');
  if(s.allocations.some(a=>a.groupId===g.id))return fail('Your group already has an allocated project.');
  const exception=s.exceptions?.some(e=>e.groupId===g.id&&e.roundId===r.id&&now<new Date(e.expiresAt));
  if(!exception&&(r.status!=='open'||now<new Date(r.opensAt)||now>=new Date(r.closesAt)))return fail('This application round is not open.');
  const available=availableProjects(s,g.cycleId),count=Math.min(3,available.length);
  if(!count)return fail('No projects remain. Please contact the convener.');
  if(choices.length!==count)return fail(`Select ${count} distinct project${count===1?'':'s'} in preference order.`);
  if(new Set(choices.map(c=>c.projectId)).size!==choices.length)return fail('Choose each project only once.');
  for(const [i,c] of choices.entries()){
    if(!available.some(p=>p.id===c.projectId))return fail('A selected project is no longer available. Update your preferences.');
    if(c.rank!==i+1)return fail('Preferences must be ordered first, second and third.');
    if(!c.suitability.trim()||!c.approach.trim())return {...fail('Explain your suitability and approach for every project.'),fieldErrors:{[c.projectId]:'Both explanations are required.'}};
  }
  return success(choices.map(c=>({...c,suitability:c.suitability.trim(),approach:c.approach.trim()})));
}
export function applyCommand(input:AppState,actorId:string,c:Command,now:Date):Result<AppState>{
  const extra=applyPlatformCommand(input,actorId,c,now);if(extra)return extra;
  const s:AppState=hydratePlatform(structuredClone(input)),u=s.users.find(u=>u.id===actorId),stamp=now.toISOString();
  if(!u)return fail('Choose a demonstration account first.','permission');
  const staff=u.role==='mentor'||u.role==='coordinator',id=()=>crypto.randomUUID();
  const log=(body:string)=>s.history.push({at:stamp,body});
  const g='groupId' in c?s.groups.find(g=>g.id===c.groupId):undefined;
  const leader=g?.leaderId===u.id,locked=g&&s.eois.some(e=>e.groupId===g.id&&e.status!=='draft');
  if(c.type==='createGroup'){
    if(u.role!=='student'||groupFor(s,u.id))return fail('You already belong to a group or cannot create one.');
    if(!c.name.trim())return fail('Enter a group name.');
    s.groups.push({id:id(),name:c.name.trim(),cycleId:s.rounds.at(-1)?.cycleId||'cycle',leaderId:u.id,memberIds:[u.id],invitations:[]});
  }else if(c.type==='deleteGroup'){
    if(u.role!=='student'||!g||!leader)return fail('Only the group leader can delete this group.','permission');
    if(s.eois.some(e=>e.groupId===g.id&&(!!e.firstSubmittedAt||e.status!=='draft'))||s.allocations.some(a=>a.groupId===g.id))return fail('A group cannot be deleted after an EOI has been submitted or a project allocated.');
    const recipients=new Set([...g.memberIds,...g.invitations.filter(i=>i.status==='pending').map(i=>i.userId)]);
    s.groups=s.groups.filter(x=>x.id!==g.id);s.eois=s.eois.filter(e=>e.groupId!==g.id);s.exceptions=s.exceptions!.filter(e=>e.groupId!==g.id);s.allocationDrafts=s.allocationDrafts!.filter(d=>d.groupId!==g.id);
    for(const userId of recipients)s.notifications!.push({id:id(),userId,body:`${g.name} was deleted by its leader. Its invitations were cancelled; members can create or join another group.`,href:'group',at:stamp,read:false});
  }else if(c.type==='setGroupUnit'){
    if(u.role!=='student'||!g||!leader)return fail('Only the group leader can select the unit code.','permission');
    if(!['9785','11522'].includes(c.unitCode))return fail('Select unit 9785 or 11522.');
    if(s.allocations.some(a=>a.groupId===g.id))return fail('The unit code is locked after allocation.');
    const submitted=s.eois.some(e=>e.groupId===g.id&&(!!e.firstSubmittedAt||e.status!=='draft')),round=s.rounds.at(-1),open=round&&(round.status==='open'&&now>=new Date(round.opensAt)&&now<new Date(round.closesAt)||s.exceptions!.some(x=>x.groupId===g.id&&x.roundId===round.id&&now<new Date(x.expiresAt)));
    if(submitted&&!open)return fail('The submitted unit code can only be revised during an open application round.');
    g.unitCode=c.unitCode;
  }else if(c.type==='renameGroup'){
    if(u.role!=='student'||!g||!leader)return fail('Only the group leader can rename this group.','permission');
    if(!c.name.trim()||c.name.trim().length>80)return fail('Enter a group name of 1–80 characters.');
    g.name=c.name.trim();
  }else if(c.type==='editProfile'){
    if(u.role!=='student')return fail('Only students edit their student profile.','permission');
    if(!c.name.trim()||c.name.trim().length>100)return fail('Enter a name of 1–100 characters.');
    u.name=c.name.trim();
  }else if(c.type==='invite'){
    const member=s.users.find(x=>x.id===c.userId);
    if(!g||!leader||locked)return fail('Only the leader can invite members before submission.');
    if(!member||member.role!=='student'||member.active===false||groupFor(s,member.id))return fail('This student already belongs to a group or is unavailable.');
    if(g.memberIds.length>=4)return fail('Your group already has four accepted members.');
    if(g.invitations.some(x=>x.userId===c.userId))return fail('An invitation already exists for this student.');
    g.invitations.push({userId:c.userId,status:'pending'});
  }else if(c.type==='acceptInvite'){
    const invitation=g?.invitations.find(i=>i.userId===u.id&&i.status==='pending');
    if(u.role!=='student'||!g||!invitation||locked)return fail('This invitation cannot be accepted.');
    if(groupFor(s,u.id))return fail('You already belong to an active group.');
    if(g.memberIds.length>=4)return fail('This group already has four accepted members.');
    g.memberIds.push(u.id);invitation.status='accepted';
  }else if(c.type==='editSkills'){
    if(u.role!=='student')return fail('Only student skills can be edited.');
    if(c.portfolio&&!safeURL(c.portfolio))return fail('Portfolio links must start with https:// or http://.');
    u.skills=[...new Set(c.skills.map(x=>x.trim()).filter(Boolean))];u.portfolio=c.portfolio;
  }else if(c.type==='correctMembers'){
    return fail('Students choose their own group members. Convenor membership replacement is not permitted.','permission');
  }else if(c.type==='saveDraft'||c.type==='submitEOI'){
    if(!g||!leader)return fail('Only the group leader can change or submit preferences.');
    const existing=s.eois.find(e=>e.groupId===g.id&&e.roundId===c.roundId);
    if(c.type==='submitEOI'&&existing?.firstSubmittedAt)preserveSubmission(existing);
    if(existing?.status==='allocated')return fail('Your group already has an allocated project.');
    let clean=c.choices;
    if(c.type==='submitEOI'){const v=validateEOI(s,g.id,c.roundId,c.choices,now);if(!v.ok)return v;clean=v.value;}
    else if((!s.rounds.some(r=>r.id===c.roundId&&r.status==='open'&&now>=new Date(r.opensAt)&&now<new Date(r.closesAt))&&!s.exceptions?.some(e=>e.groupId===g.id&&e.roundId===c.roundId&&now<new Date(e.expiresAt)))||s.allocations.some(a=>a.groupId===g.id))return fail('Drafting is unavailable outside an open application round.');
    const e=existing||{id:id(),groupId:g.id,roundId:c.roundId,choices:[],status:'draft' as const,history:[]};
    if(c.type==='saveDraft'&&e.firstSubmittedAt){e.draftChoices=clean;e.draftEditedAt=stamp;}
    else{e.choices=clean;e.lastEditedAt=stamp;}
    if(c.type==='submitEOI'){if(e.firstSubmittedAt)preserveSubmission(e);e.version=(e.firstSubmittedAt?(e.version||1):(e.version||0))+1;e.unitCode=c.unitCode||e.unitCode;e.contactName=c.contactName||e.contactName;e.contactEmail=c.contactEmail||e.contactEmail;e.status='submitted';delete e.reason;e.firstSubmittedAt??=stamp;e.members=g.memberIds.map(i=>{const m=s.users.find(u=>u.id===i)!;return {name:m.name,skills:[...m.skills],email:m.email};});delete e.draftChoices;delete e.draftEditedAt;e.history.push({at:stamp,body:existing?.firstSubmittedAt?'Application updated':'Application submitted'});}
    if(c.type==='submitEOI'){preserveSubmission(e);for(const d of s.sponsorDecisions!.filter(d=>d.eoiId===e.id&&d.eoiVersion!==(e.version||1)&&d.status==='pending'))d.status='superseded';}
    if(!existing)s.eois.push(e);
  }else if(c.type==='allocate'){
    const p=s.projects.find(p=>p.id===c.projectId);
    if(u.role!=='coordinator'||!p||!g)return fail('Only the convenor can allocate this project.','permission');
    if(!c.rationale.trim())return fail('Enter an allocation rationale.');
    if(p.status!=='published'||s.allocations.some(a=>a.projectId===p.id||a.groupId===g.id))return fail('The project or group has already been allocated.');
    const eligible=s.eois.find(e=>e.groupId===g.id&&e.status==='submitted'&&e.choices.some(x=>x.projectId===p.id));
    if(!eligible)return fail('Select a group with a submitted application for this project.');
    s.allocations.push({id:id(),groupId:g.id,projectId:p.id,mentorId:u.id,createdAt:stamp,rationale:c.rationale.trim()});p.status='allocated';
    for(const e of s.eois.filter(e=>e.status==='submitted')){
      if(e.groupId===g.id){e.status='allocated';e.history.push({at:stamp,body:`Allocated: ${p.title}`});}
      else if(e.choices.every(choice=>!availableProjects(s,g.cycleId).some(p=>p.id===choice.projectId))){e.status='unsuccessful';e.reason='All selected projects have been allocated. Apply in the next round.';e.history.push({at:stamp,body:e.reason});}
    }
    log(`${g.name} allocated to ${p.title}: ${c.rationale.trim()}`);
  }else if(c.type==='rejectEOI'){
    const e=s.eois.find(e=>e.id===c.eoiId);
    if(u.role!=='coordinator'||!e||e.status!=='submitted'||!c.reason.trim())return fail('Choose an application under review and provide a reason.');
    e.status='unsuccessful';e.reason=c.reason.trim();e.history.push({at:stamp,body:e.reason});
  }else if(c.type==='createProject'){
    if(u.role!=='coordinator')return fail('Only the convenor can create projects.','permission');
    if(!c.project.title.trim()||!c.project.brief.trim()||!s.users.some(x=>x.id===c.project.sponsorId&&x.role==='sponsor')||(c.project.mentorId!==''&&!s.users.some(x=>x.id===c.project.mentorId&&x.role==='mentor')))return fail('Title, brief, sponsor and mentor are required.');
    s.projects.push({...c.project,title:c.project.title.trim(),id:id(),status:'draft',cycleId:s.rounds.at(-1)?.cycleId||'cycle'});
  }else if(c.type==='publishProject'){
    const p=s.projects.find(p=>p.id===c.projectId);
    if(u.role!=='coordinator'||!p||p.status!=='draft')return fail('You cannot publish this project.');p.status='published';
  }else if(c.type==='openRound'){
    if(u.role!=='coordinator')return fail('Only the convener opens application rounds.');
    if(!Number.isFinite(Date.parse(c.opensAt))||!Number.isFinite(Date.parse(c.closesAt))||new Date(c.closesAt)<=new Date(c.opensAt))return fail('Choose a valid deadline after the opening date.');
    s.rounds.forEach(r=>r.status='closed');s.rounds.push({id:id(),cycleId:s.rounds.at(-1)?.cycleId||'cycle',sequence:s.rounds.length+1,opensAt:c.opensAt,closesAt:c.closesAt,status:'open'});
  }else if(c.type==='closeRound'){
    const r=s.rounds.find(r=>r.id===c.roundId);if(u.role!=='coordinator'||!r)return fail('Only the convener closes rounds.');r.status='closed';
  }else if(c.type==='postRecord'){
    const p=s.projects.find(p=>p.id===c.projectId);
    if(!p||!projectAccess(s,u,p)||!s.allocations.some(a=>a.projectId===p.id))return fail('This project workspace is unavailable.');
    if((c.visibility==='team'&&u.role!=='student')||(c.visibility==='mentor'&&!staff))return fail('You cannot post in this discussion.');
    if(!c.body.trim())return fail('Enter a message or description.');
    if(c.url&&!safeURL(c.url))return fail('Links must start with https:// or http://.');
    if(c.recordType==='meeting'&&(!c.meetingAt||!Number.isFinite(Date.parse(c.meetingAt))||new Date(c.meetingAt)<=now))return fail('Choose a meeting time in the future.');
    if((c.recordType==='update'||c.recordType==='deliverable')&&u.role!=='student')return fail('Only the student group posts updates and deliverables.');
    if(c.recordType==='deliverable'&&!c.url)return fail('Provide a deliverable link.');
    if(c.recordType==='review'&&(!staff||!s.records.some(r=>r.id===c.parentId&&r.type==='deliverable'&&r.projectId===p.id)||!['Under review','Changes requested','Review complete'].includes(c.status||'')))return fail('Choose a deliverable and valid mentor review status.');
    const version=c.recordType==='deliverable'?1+s.records.filter(r=>r.projectId===p.id&&r.type==='deliverable'&&r.title===c.title).length:undefined;
    s.records.push({id:id(),projectId:p.id,authorId:u.id,type:c.recordType,visibility:c.visibility,body:c.body.trim(),createdAt:stamp,title:c.title,next:c.next,blockers:c.blockers,url:c.url,meetingAt:c.meetingAt,parentId:c.parentId,version,status:c.recordType==='meeting'?'pending':c.recordType==='deliverable'?'Submitted':c.status});
    if(c.recordType==='review'){const parent=s.records.find(r=>r.id===c.parentId)!;parent.status=c.status;}
  }else if(c.type==='updateMeeting'){
    const r=s.records.find(r=>r.id===c.recordId&&r.type==='meeting'),p=r&&s.projects.find(p=>p.id===r.projectId);
    if(!r||!p||!projectAccess(s,u,p))return fail('This meeting is unavailable.');
    if((r.visibility==='team'&&(u.role!=='student'||!s.allocations.some(a=>a.projectId===p.id&&s.groups.find(g=>g.id===a.groupId)?.memberIds.includes(u.id))))||(r.visibility==='mentor'&&!['mentor','coordinator'].includes(u.role)))return fail('You cannot update this private meeting.','permission');
    if(c.url&&!safeURL(c.url))return fail('Meeting links must start with https:// or http://.');
    r.status=c.status;r.url=c.url||r.url;
  }else{return fail('Unknown command.');}
  s.audit!.push({id:id(),actorId:u.id,action:c.type,recordId:'groupId' in c?c.groupId:'projectId' in c?c.projectId:u.id,reason:'reason' in c?c.reason:'',at:stamp});
  if(c.type==='submitEOI'){for(const recipient of [...s.users.filter(x=>x.role==='coordinator').map(x=>x.id),...(g?.memberIds||[])])s.notifications!.push({id:id(),userId:recipient,body:'EOI submitted and received for convenor review.',href:recipient===u.id?'preferences':'allocation',at:stamp,read:false});}
  return success(s);
}
export function safeURL(value:string){try{return ['https:','http:'].includes(new URL(value).protocol);}catch{return false;}}
export function visibleState(input:AppState,actorId:string):AppState{
  const s=structuredClone(input),u=s.users.find(u=>u.id===actorId);
  if(!u)return {...s,projects:[],groups:[],eois:[],allocations:[],records:[],users:[],history:[]};
  if(u.role==='coordinator'){s.records=[];return filterPlatform(input,s,u);}
  s.projects=s.projects.filter(p=>u.role==='student'?p.status!=='draft':u.role==='mentor'?p.mentorId===u.id:u.role==='tutor'?false:p.sponsorId===u.id);
  const pids=new Set(s.projects.map(p=>p.id));
  s.allocations=s.allocations.filter(a=>pids.has(a.projectId));
  if(u.role==='student'){s.availableStudentIds=input.users.filter(user=>user.role==='student'&&user.active!==false&&!groupFor(input,user.id)).map(user=>user.id);s.eois=s.eois.filter(e=>groupFor(s,u.id)?.id===e.groupId);s.groups=s.groups.filter(g=>g.memberIds.includes(u.id)||g.invitations.some(i=>i.userId===u.id));s.allocations=s.allocations.filter(a=>s.groups.some(g=>g.id===a.groupId&&g.memberIds.includes(u.id)));}
  if(u.role==='mentor'){s.eois=[];s.groups=s.groups.filter(g=>s.allocations.some(a=>a.groupId===g.id));}
  if(u.role==='sponsor'){s.eois=[];s.groups=s.groups.filter(g=>s.allocations.some(a=>a.groupId===g.id));s.users=s.users.filter(x=>x.id===u.id||s.groups.some(g=>g.memberIds.includes(x.id))||s.projects.some(p=>p.mentorId===x.id));}
  s.records=s.records.filter(r=>{const p=s.projects.find(p=>p.id===r.projectId);return p&&projectAccess(s,u,p)&&(r.visibility==='shared'||(r.visibility==='team'&&u.role==='student')||(r.visibility==='mentor'&&u.role==='mentor'));});
  s.history=[];return filterPlatform(input,s,u);
}
export function formatTime(value:string){return new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',timeZone:'Australia/Sydney',timeZoneName:'short'}).format(new Date(value));}
