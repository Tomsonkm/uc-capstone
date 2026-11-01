import {visibleState} from '../src/domain/workflow';
import type {AppState} from '../src/domain/types';
export interface Snapshot {format:'uc-capstone-backup';version:1;createdAt:string;payload:{state:AppState;accounts:unknown[]};sha256:string}
async function checksum(payload:unknown){const bytes=new TextEncoder().encode(JSON.stringify(payload)),hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function createSnapshot(state:AppState,accounts:unknown[]):Promise<Snapshot>{const payload={state,accounts};return {format:'uc-capstone-backup',version:1,createdAt:new Date().toISOString(),payload,sha256:await checksum(payload)};}
export async function validateSnapshot(value:unknown):Promise<Snapshot>{
 const s=value as Snapshot;if(s?.format!=='uc-capstone-backup'||s.version!==1||!s.payload||s.sha256!==await checksum(s.payload)||!Number.isFinite(Date.parse(s.createdAt)))throw Error('Backup format or checksum is invalid.');
 const state=s.payload.state;if(!state||state.version!==1||!['users','groups','projects','rounds','eois','allocations','records'].every(k=>Array.isArray(state[k as keyof AppState]))||!Array.isArray(s.payload.accounts))throw Error('Backup records are incomplete.');
 const projects=new Set(state.projects.map(p=>p.id)),groups=new Set(state.groups.map(g=>g.id));if(projects.size!==state.projects.length||groups.size!==state.groups.length||state.allocations.some(a=>!projects.has(a.projectId)||!groups.has(a.groupId)))throw Error('Backup has invalid references.');
 for(const account of s.payload.accounts){if(!account||typeof account!=='object'||['password','encrypted_password','access_token','refresh_token','secret'].some(k=>k in account))throw Error('Backup must not contain account credentials.');}
 return s;
}

export async function createAdministrativeSnapshot(state:AppState,accounts:unknown[],actorId:string){if(!state.users.some(u=>u.id===actorId&&u.role==='coordinator'&&u.active!==false))throw Error('An authorised convenor must exist in these snapshot records.');return createSnapshot(visibleState(state,actorId),accounts);}
