import type {PlatformCommand,PlatformCollections} from './platformTypes';
export type Role = 'student'|'mentor'|'coordinator'|'sponsor'|'tutor';
export type Visibility = 'team'|'shared'|'mentor';
export type Result<T> = {ok:true;value:T}|{ok:false;code:string;message:string;fieldErrors?:Record<string,string>};
export interface User {id:string;name:string;role:Role;skills:string[];title?:string;company?:string;portfolio?:string;email?:string;username?:string;active?:boolean}
export interface Group {id:string;name:string;cycleId:string;leaderId:string;unitCode?:'9785'|'11522';memberIds:string[];invitations:{userId:string;status:'pending'|'accepted'}[]}
export interface Project {id:string;title:string;category:string;sponsorId:string;mentorId:string;sponsor:string;brief:string;outcomes:string[];skills:string[];status:'draft'|'published'|'allocated'|'closed';cycleId:string;art:string;code?:string;source?:'uc-s2-2026-v1';sourcePage?:number;sourceNote?:string;scope?:string;requirements?:string;catalogueArchive?:boolean}
export interface Round {id:string;cycleId:string;sequence:number;opensAt:string;closesAt:string;status:'open'|'closed'}
export interface EOIChoice {projectId:string;rank:1|2|3;suitability:string;approach:string}
export interface EOI {id:string;groupId:string;roundId:string;choices:EOIChoice[];draftChoices?:EOIChoice[];draftEditedAt?:string;status:'draft'|'submitted'|'under_review'|'awaiting_sponsor'|'approved'|'unsuccessful'|'allocated';firstSubmittedAt?:string;lastEditedAt?:string;members?:{name:string;skills:string[];email?:string}[];corrections?:{at:string;reason:string;members:{name:string;skills:string[]}[]}[];history:{at:string;body:string}[];reason?:string;version?:number;unitCode?:string;contactName?:string;contactEmail?:string;versions?:EOIVersion[]}
export interface Allocation {id:string;groupId:string;projectId:string;mentorId:string;tutorId?:string;createdAt:string;rationale:string}
export interface EOIVersion {version:number;at:string;choices:EOIChoice[];members?:{name:string;skills:string[];email?:string}[];unitCode?:string;contactName?:string;contactEmail?:string}
export type RecordType = 'update'|'message'|'meeting'|'deliverable'|'review';
export interface WorkspaceRecord {id:string;projectId:string;authorId:string;type:RecordType;visibility:Visibility;body:string;createdAt:string;title?:string;next?:string;blockers?:string;url?:string;meetingAt?:string;status?:string;version?:number;parentId?:string}
export interface AppState extends PlatformCollections {availableStudentIds?:string[];version:1;users:User[];groups:Group[];projects:Project[];rounds:Round[];eois:EOI[];allocations:Allocation[];records:WorkspaceRecord[];history:{at:string;body:string}[]}
export type Command = PlatformCommand | LegacyCommand;
export type LegacyCommand =
 | {type:'createGroup';name:string}
 | {type:'deleteGroup';groupId:string}
 | {type:'setGroupUnit';groupId:string;unitCode:'9785'|'11522'}
 | {type:'renameGroup';groupId:string;name:string}
 | {type:'editProfile';name:string}
 | {type:'invite';groupId:string;userId:string}
 | {type:'acceptInvite';groupId:string}
 | {type:'editSkills';skills:string[];portfolio?:string}
 | {type:'correctMembers';groupId:string;memberIds:string[];reason:string}
 | {type:'saveDraft'|'submitEOI';groupId:string;roundId:string;choices:EOIChoice[];unitCode?:string;contactName?:string;contactEmail?:string}
 | {type:'allocate';groupId:string;projectId:string;rationale:string}
 | {type:'rejectEOI';eoiId:string;reason:string}
 | {type:'createProject';project:Omit<Project,'id'|'status'|'cycleId'>}
 | {type:'publishProject';projectId:string}
 | {type:'openRound';opensAt:string;closesAt:string}
 | {type:'closeRound';roundId:string}
 | {type:'postRecord';projectId:string;recordType:RecordType;visibility:Visibility;body:string;title?:string;next?:string;blockers?:string;url?:string;meetingAt?:string;parentId?:string;status?:string}
 | {type:'updateMeeting';recordId:string;status:'confirmed'|'declined'|'cancelled';url?:string};
