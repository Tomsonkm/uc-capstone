import type {Project,EOIChoice,EOIVersion} from './types';
export interface Proposal {id:string;sponsorId:string;title:string;brief:string;category:string;skills:string[];outcomes:string[];status:'draft'|'pending'|'changes_requested'|'rejected'|'approved'|'withdrawn';version:number;projectId?:string;history:{at:string;body:string}[]}
export interface Interest {id:string;userId:string;projectId?:string;kind:'mentor'|'tutor';capacity:number;statement:string;status:'pending'|'approved'|'rejected';at:string}
export interface Notification {id:string;userId:string;body:string;href:string;at:string;read:boolean}
export interface Channel {id:string;title:string;kind:'team'|'student-mentor'|'student-sponsor'|'shared'|'mentor-convenor'|'tutor-convenor'|'sponsor-convenor';projectId?:string;groupId?:string;memberIds:string[]}
export interface ChatMessage {id:string;channelId:string;authorId:string;body:string;at:string}
export interface DocumentVersion {id:string;channelId:string;title:string;name:string;mime:string;size:number;authorId:string;at:string;version:number;storageKey:string}
export interface Task {id:string;projectId:string;title:string;assigneeId:string;dueAt:string;status:'open'|'done';authorId:string}
export interface DeadlineException {id:string;groupId:string;roundId:string;expiresAt:string;reason:string;authorId:string}
export interface AllocationDraft {id:string;groupId:string;projectId:string;mentorId:string;tutorId?:string;rationale:string;eoiId:string;eoiVersion:number;at:string}
export interface SponsorDecision {id:string;eoiId:string;projectId:string;sponsorId:string;eoiVersion:number;status:'pending'|'accepted'|'rejected'|'superseded';reason:string;at:string;application?:EOIVersion}
export interface AuditEvent {id:string;actorId:string;action:string;recordId:string;reason:string;at:string}
export type PlatformCommand=
 |{type:'saveProposal';proposalId?:string;title:string;brief:string;category:string;skills:string[];outcomes:string[];submit:boolean}
 |{type:'reviewProposal';proposalId:string;decision:'approved'|'changes_requested'|'rejected';reason:string}
 |{type:'withdrawProposal';proposalId:string}
 |{type:'publishProposal';proposalId:string}
 |{type:'deleteProposal';proposalId:string}
 |{type:'closeProject';projectId:string;reason:string}
 |{type:'linkSponsor';projectId:string;sponsorId:string;reason:string}
 |{type:'reviewEOI';eoiId:string;decision:'under_review'|'approved'|'unsuccessful';reason:string}
 |{type:'forwardEOI';eoiId:string;projectId:string}
 |{type:'sponsorDecision';decisionId:string;decision:'accepted'|'rejected';reason:string}
 |{type:'saveAllocationDraft';groupId:string;projectId:string;mentorId:string;tutorId?:string;rationale:string}
 |{type:'confirmAllocation';draftId:string}
 |{type:'expressInterest';projectId?:string;capacity:number;statement:string}
 |{type:'reviewInterest';interestId:string;decision:'approved'|'rejected'}
 |{type:'deadlineException';groupId:string;roundId:string;expiresAt:string;reason:string}
 |{type:'sendMessage';channelId:string;body:string}
 |{type:'markRead';notificationId:string}
 |{type:'createChannel';kind:Channel['kind'];targetId:string}
 |{type:'saveTask';projectId:string;title:string;assigneeId:string;dueAt:string}
 |{type:'completeTask';taskId:string}
 |{type:'solicitProposal';sponsorId:string;body:string}
 |{type:'registerDocument';document:Omit<DocumentVersion,'id'|'authorId'|'at'|'version'>}
 |{type:'reopenEOI';eoiId:string;reason:string};
export interface PlatformCollections {proposals?:Proposal[];interests?:Interest[];notifications?:Notification[];channels?:Channel[];messages?:ChatMessage[];documents?:DocumentVersion[];tasks?:Task[];exceptions?:DeadlineException[];allocationDrafts?:AllocationDraft[];sponsorDecisions?:SponsorDecision[];audit?:AuditEvent[]}
export type ProposalProject=Pick<Project,'title'|'brief'|'skills'|'outcomes'|'category'>;
export type RankedChoices=EOIChoice[];
