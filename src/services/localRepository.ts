import type {AppState} from '../domain/types';
import type {Repository} from './repository';
import {applyCommand} from '../domain/workflow';
import {createSeed} from './seed';
import {validateState} from './validateState';
import {withSemesterCatalogue} from './catalogue';
import {hydratePlatform} from '../domain/platformWorkflow';
const key='uc-capstone-demo-v1';
function parse(raw:string):AppState{
 const state=hydratePlatform(withSemesterCatalogue(validateState(JSON.parse(raw)))),fresh=createSeed();
 for(const u of fresh.users){const current=state.users.find(x=>x.id===u.id);if(!current)state.users.push(u);else if(!current.email)current.email=u.email;}
 for(const p of state.projects){if(p.catalogueArchive&&p.sponsorId==='sponsor-1'&&p.sponsor!=='CivicLab'){const original=fresh.projects.find(x=>x.id===p.id);if(original)p.sponsorId=original.sponsorId;}}
 for(const e of state.eois.filter(e=>e.status==='unsuccessful')){
  if(state.exceptions!.some(x=>x.groupId===e.groupId&&x.roundId===e.roundId))continue;
  const rejectedAt=e.history.at(-1)?.at||e.lastEditedAt||e.firstSubmittedAt;
  if(rejectedAt&&Number.isFinite(Date.parse(rejectedAt)))state.exceptions!.push({id:`resubmit-${e.id}`,groupId:e.groupId,roundId:e.roundId,expiresAt:new Date(Date.parse(rejectedAt)+72*60*60*1000).toISOString(),reason:'Resubmission after rejection',authorId:state.users.find(u=>u.role==='coordinator')?.id||'convenor'});
 }
 return state;
}
export function createLocalRepository(storage:Storage|null,now:()=>Date):Repository{
 let state=createSeed(now()),mode:'local'|'memory'=storage?'local':'memory',notice='';const listeners=new Set<()=>void>();
 try{const raw=storage?.getItem(key);if(raw)state=parse(raw);}catch{notice='Saved demo data could not be read. A fresh demonstration is loaded.';}
 function persist(){try{storage?.setItem(key,JSON.stringify(state));}catch{mode='memory';notice='Browser storage is unavailable. Changes last for this session only.';}}
 if(!storage)notice='Browser storage is unavailable. Changes last for this session only.';
 return {
 snapshot:()=>state,persistenceStatus:()=>mode,recoveryNotice:()=>notice,
 subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},
 dispatch(actorId,command){
  if(mode==='local'){try{const raw=storage?.getItem(key);if(raw)state=parse(raw);}catch{mode='memory';notice='Saved data became unavailable. Working in this session.';}}
  const result=applyCommand(state,actorId,command,now());if(result.ok){state=result.value;persist();listeners.forEach(fn=>fn());}return result;
 },
 reset(){state=createSeed(now());notice='';persist();listeners.forEach(fn=>fn());}
 };
}
