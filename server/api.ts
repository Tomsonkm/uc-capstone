import {validCommand} from './commands';
import {authenticated,authenticationAction,authReady,json,errorResponse,sameOrigin,type Runtime} from './auth';
import {loadState,commitState,initialiseCatalogue} from './store';
import {applyCommand,visibleState} from '../src/domain/workflow';
import {canReadChannel} from '../src/domain/platformWorkflow';
import {validateUpload} from './files';
import type {Command,Role} from '../src/domain/types';
import {createAdministrativeSnapshot,validateSnapshot} from './backups';
const idPattern=/^[a-zA-Z0-9._:-]{1,150}$/;
async function readBytes(request:Request,max:number){const reader=request.body?.getReader();if(!reader)return new Uint8Array();let size=0;const chunks:Uint8Array[]=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('The upload exceeds the size limit.');}chunks.push(value);}const result=new Uint8Array(size);let i=0;for(const chunk of chunks){result.set(chunk,i);i+=chunk.length;}return result;}
export async function handleAPI(request:Request,env:Runtime):Promise<Response>{
 const url=new URL(request.url),path=url.pathname;
 try{
  if(path==='/api/auth/readiness')return json({ok:true,value:{ready:authReady(env)}});
  if(path==='/api/setup/catalogue'&&request.method==='POST'){
   if(!env.SETUP_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.SETUP_TOKEN}`)return errorResponse('Setup access denied.','permission',403);
   await initialiseCatalogue(env.DB);const loaded=await loadState(env.DB);return json({ok:true,value:{projects:loaded.state.projects.length}});
  }
  if(path.startsWith('/api/auth/'))return authenticationAction(request,env,path.split('/').at(-1)!);
  if(request.method!=='GET'&&!sameOrigin(request))return errorResponse('This request must come from the website.','origin',403);
  if(!authReady(env))return errorResponse('Real account authentication is not configured.','setup',503);
  const {auth,user,account}=await authenticated(request,env);if(!user)return errorResponse('Your session has expired. Please sign in.','session',401,auth.headers);
  if(!account)return errorResponse('Complete your verified semester-access request using a new username.','onboarding',403,auth.headers);
  if(!account.approved||!account.active)return errorResponse('Your account is awaiting convenor approval for this semester. The fictional demonstration remains separate.','pending',403,auth.headers);
  const loaded=await loadState(env.DB),actor=loaded.state.users.find(u=>u.id===user.id);if(!actor)return errorResponse('Semester membership is unavailable.','permission',403,auth.headers);
  if((path.startsWith('/api/files')||path.startsWith('/api/documents'))&&['coordinator','tutor'].includes(actor.role))return errorResponse('Project documents are limited to students, mentors and sponsors.','permission',403,auth.headers);
  if(path==='/api/session')return json({ok:true,value:{actor,state:visibleState(loaded.state,actor.id)}},200,auth.headers);
  if(path==='/api/accounts'){
   if(actor.role!=='coordinator')return errorResponse('Convenor access required.','permission',403,auth.headers);
   if(request.method==='GET'){const rows=await env.DB.prepare('SELECT id,name,email,username,role,approved,active,created_at FROM accounts ORDER BY created_at DESC').all();return json({ok:true,value:rows.results},200,auth.headers);}
   const b=await request.json() as any;if(!idPattern.test(b.id)||!['student','coordinator','mentor','sponsor','tutor'].includes(b.role)||typeof b.approved!=='boolean'||typeof b.active!=='boolean'||!b.reason?.trim())return errorResponse('Choose an account, role, access state and reason.');
   if(b.id===actor.id&&(!b.approved||!b.active||b.role!=='coordinator'))return errorResponse('You cannot remove your own convenor access.');
   if(!await env.DB.prepare('SELECT id FROM accounts WHERE id=?').bind(b.id).first())return errorResponse('Account unavailable.','missing',404,auth.headers);
   loaded.state.audit!.push({id:crypto.randomUUID(),actorId:actor.id,action:'account-access',recordId:b.id,reason:b.reason,at:new Date().toISOString()});if(!await commitState(env.DB,loaded.state,loaded.revision,crypto.randomUUID(),actor.id,{id:b.id,role:b.role,approved:b.approved,active:b.active}))return errorResponse('Another user changed access records. Refresh before retrying.','conflict',409,auth.headers);return json({ok:true,value:{}},200,auth.headers);
  }
  if(path==='/api/command'){
   const body=await request.json() as any;if(!validCommand(body.command)||typeof body.operationId!=='string'||!idPattern.test(body.operationId))return errorResponse('The submitted information is incomplete or invalid.');
   const prior=await env.DB.prepare('SELECT actor_id FROM operations WHERE id=?').bind(body.operationId).first();if(prior&&prior.actor_id!==actor.id)return errorResponse('This request reference belongs to another account.','permission',403);
   if(!prior){const result=applyCommand(loaded.state,actor.id,body.command as Command,new Date());if(!result.ok)return json(result,result.code==='permission'?403:400,auth.headers);if(!await commitState(env.DB,result.value,loaded.revision,body.operationId,actor.id))return errorResponse('Another user changed these records. Refresh and review before trying again.','conflict',409,auth.headers);}
   const latest=await loadState(env.DB);return json({ok:true,value:{actor:latest.state.users.find(u=>u.id===actor.id),state:visibleState(latest.state,actor.id)}},200,auth.headers);
  }
  if(path==='/api/files'&&request.method==='POST'){
   const bytes=await readBytes(request,21*1024*1024),form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')||''},body:bytes}).formData(),file=form.get('file'),channelId=String(form.get('channelId')),title=String(form.get('title')||'');
   const channel=loaded.state.channels!.find(c=>c.id===channelId);if(!channel||!canReadChannel(loaded.state,actor.id,channel))return errorResponse('This conversation is unavailable.','permission',403);
   if(!file||typeof file==='string'||!title.trim())return errorResponse('Choose a file and provide a document title.');
   const data=new Uint8Array(await file.arrayBuffer()),invalid=validateUpload(file.name,file.type,data);if(invalid)return errorResponse(invalid);
   const key=`documents/${crypto.randomUUID()}`;await env.BUCKET.put(key,data,{httpMetadata:{contentType:file.type}});
   const result=applyCommand(loaded.state,actor.id,{type:'registerDocument',document:{channelId,title,name:file.name,mime:file.type,size:data.length,storageKey:key}},new Date());
   if(!result.ok||!await commitState(env.DB,result.value,loaded.revision,crypto.randomUUID(),actor.id)){await env.BUCKET.delete(key);return errorResponse('The file could not be registered. Please retry.','conflict',409);}
   return json({ok:true,value:{}},200,auth.headers);
  }
  if(path.startsWith('/api/files/')&&request.method==='GET'){
   const doc=loaded.state.documents!.find(d=>d.id===path.split('/').at(-1)),channel=loaded.state.channels!.find(c=>c.id===doc?.channelId);if(!doc||!channel||!canReadChannel(loaded.state,actor.id,channel))return errorResponse('File unavailable.','permission',404);
   const object=await env.BUCKET.get(doc.storageKey);if(!object)return errorResponse('The stored file is unavailable. Contact the convenor.','missing',404);
   const headers=new Headers(auth.headers);headers.set('Cache-Control','private, no-store');headers.set('Content-Type',doc.mime);headers.set('X-Content-Type-Options','nosniff');headers.set('Content-Disposition',`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(doc.name)}`);return new Response(object.body,{headers});
  }
  if(path==='/api/reports/export'&&request.method==='GET'){
   if(actor.role!=='coordinator')return errorResponse('Convenor access required.','permission',403);
   const cell=(x:unknown)=>{let v=String(x??'');if(/^[=+@\-\t\r]/.test(v))v=`'${v}`;return `"${v.replaceAll('"','""')}"`;};const csv=[['Project ID','Title','Sponsor','Status','Group','Mentor'],...loaded.state.projects.map(p=>{const a=loaded.state.allocations.find(a=>a.projectId===p.id);return [p.code||p.id,p.title,p.sponsor,p.status,loaded.state.groups.find(g=>g.id===a?.groupId)?.name||'',loaded.state.users.find(u=>u.id===a?.mentorId)?.name||''];})].map(r=>r.map(cell).join(',')).join('\r\n');
   return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="capstone-report.csv"','Cache-Control':'private, no-store'}});
  }
  if(path==='/api/backups'&&request.method==='POST'){
   if(actor.role!=='coordinator')return errorResponse('Convenor access required.','permission',403);
   const accounts=await env.DB.prepare('SELECT id,email,username,name,role,approved,active,created_at FROM accounts').all(),backup=await createAdministrativeSnapshot(loaded.state,accounts.results||[],actor.id),key=`backups/${backup.createdAt.replaceAll(':','-')}-${crypto.randomUUID()}.json`;await env.BUCKET.put(key,JSON.stringify(backup),{httpMetadata:{contentType:'application/json'}});
   loaded.state.audit!.push({id:crypto.randomUUID(),actorId:actor.id,action:'backup-created',recordId:key,reason:'Administrative snapshot; student work excluded',at:new Date().toISOString()});if(!await commitState(env.DB,loaded.state,loaded.revision,crypto.randomUUID(),actor.id)){await env.BUCKET.delete(key);return errorResponse('Records changed during backup. Please retry.','conflict',409,auth.headers);}return json({ok:true,value:{message:'A private administrative snapshot was saved. Student project work is excluded.',key}},200,auth.headers);
  }
  if(path==='/api/backups'&&request.method==='GET'){
   if(actor.role!=='coordinator')return errorResponse('Convenor access required.','permission',403);
   const list=await env.BUCKET.list({prefix:'backups/'});return json({ok:true,value:list.objects.map((o:any)=>({key:o.key,size:o.size,uploaded:o.uploaded}))},200,auth.headers);
  }
  if(path==='/api/backups/download'&&request.method==='GET'){
   const key=url.searchParams.get('key')||'';if(actor.role!=='coordinator'||!/^backups\/[a-zA-Z0-9.:-]+\.json$/.test(key))return errorResponse('Backup unavailable.','permission',403);
   const object=await env.BUCKET.get(key);if(!object)return errorResponse('Backup unavailable.','missing',404);const saved=await validateSnapshot(await object.json()),safe=await createAdministrativeSnapshot(saved.payload.state,saved.payload.accounts,actor.id);return new Response(JSON.stringify(safe),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="capstone-administrative-snapshot.json"','Cache-Control':'private, no-store'}});
  }
  return errorResponse('This operation is unavailable.','missing',404,auth.headers);
 }catch(error){console.error('Capstone API failure',error instanceof Error?error.message:'Unknown error');return errorResponse('The request could not be completed. Your existing records were kept. Please retry or contact the convenor.','server',500);}
}
