import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
import type {DB} from './store';
export interface Runtime {DB:DB;BUCKET:any;SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;INITIAL_CONVENOR_EMAIL?:string;BACKUP_JOB_TOKEN?:string;SETUP_TOKEN?:string}
export function authReady(env:Runtime){return !!env.SUPABASE_URL?.startsWith('https://')&&!!env.SUPABASE_PUBLISHABLE_KEY;}
export function authClient(request:Request,env:Runtime,remember?:boolean){
 if(!authReady(env))throw Error('Account authentication is not configured. You may explore the separate fictional demonstration.');
 const jar=parseCookieHeader(request.headers.get('cookie')||''),headers=new Headers(),secure=new URL(request.url).protocol==='https:',persistent=remember??jar.some(c=>c.name==='capstone-remember'&&c.value==='1');
 const client=createServerClient(env.SUPABASE_URL!,env.SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.map(c=>({name:c.name,value:c.value||''})),setAll:values=>{for(const cookie of values){const opts:any={...cookie.options,httpOnly:true,secure,sameSite:'lax',path:'/'};if(persistent)opts.maxAge=Math.min(opts.maxAge||2592000,2592000);else if(opts.maxAge!==0){delete opts.maxAge;delete opts.expires;}headers.append('Set-Cookie',serializeCookieHeader(cookie.name,cookie.value,opts));}}}});
 return {client,headers,remember:persistent};
}
export function json(value:unknown,status=200,headers=new Headers()){
 headers.set('Content-Type','application/json');headers.set('Cache-Control','private, no-store');headers.set('X-Content-Type-Options','nosniff');return new Response(JSON.stringify(value),{status,headers});
}
export const errorResponse=(message:string,code='invalid',status=400,headers?:Headers)=>json({ok:false,code,message},status,headers);
function emailDeliveryError(error:{code?:string}|null,headers:Headers){
 if(error?.code==='over_email_send_rate_limit')return errorResponse('The email sending limit has been reached. Please wait before trying again. Contact the convenor if this continues; the website email service may need configuration.','email_rate_limit',429,headers);
 return null;
}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export async function authenticated(request:Request,env:Runtime){
 const auth=authClient(request,env),{data,error}=await auth.client.auth.getUser();
 if(error||!data.user||!data.user.email_confirmed_at)return {auth,account:null,user:null};
 const account=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(data.user.id).first();
 return {auth,account,user:data.user};
}
export async function authenticationAction(request:Request,env:Runtime,action:string){
 if(!sameOrigin(request))return errorResponse('This request must come from the website.','origin',403);
 if(!authReady(env))return errorResponse('Real account login is awaiting its authentication connection. The separate demonstration uses fictional data.','setup',503);
 const b=await request.json() as any;if(!b||typeof b!=='object')return errorResponse('Invalid request.');
 const auth=authClient(request,env,action==='login'?b.remember===true:undefined),{client,headers}=auth;
 if(action==='login'){
  if(typeof b.username!=='string'||typeof b.password!=='string'||b.password.length>256)return errorResponse('Enter your email or username and password.');
  let email=b.username.trim().toLowerCase();if(!email.includes('@')){const a=await env.DB.prepare('SELECT email FROM accounts WHERE username=?').bind(email).first();email=a?.email||'unknown@invalid.example';}
  const {error}=await client.auth.signInWithPassword({email,password:b.password});if(error)return errorResponse('Email/username or password is incorrect.','credentials',401,headers);
  headers.append('Set-Cookie',serializeCookieHeader('capstone-remember',auth.remember?'1':'',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:auth.remember?2592000:0}));return json({ok:true,value:{signedIn:true}},200,headers);
 }
 if(action==='register'){
  if(typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email)||typeof b.password!=='string'||b.password.length<12||b.password.length>128||typeof b.name!=='string'||!b.name.trim()||typeof b.username!=='string'||!/^[a-z0-9._-]{3,40}$/i.test(b.username)||!['student','mentor','sponsor','tutor','coordinator'].includes(b.role))return errorResponse('Provide a name, valid email, username (3–40 letters/numbers) and a password of at least 12 characters.');
  const existing=await env.DB.prepare('SELECT id,email FROM accounts WHERE username=?').bind(b.username.toLowerCase()).first();if(existing&&existing.email!==b.email.trim().toLowerCase())return errorResponse('That username is unavailable. Choose another username.','username',409,headers);
  const origin=new URL(request.url).origin,{data,error}=await client.auth.signUp({email:b.email.trim().toLowerCase(),password:b.password,options:{emailRedirectTo:`${origin}/auth/confirm`,data:{name:b.name.trim(),username:b.username.toLowerCase(),requested_role:b.role}}});
  const deliveryError=emailDeliveryError(error,headers);if(deliveryError)return deliveryError;
  if(error||!data.user)return errorResponse('Registration could not be completed. Check your details or try password recovery.','registration',400,headers);
  const inserted=await env.DB.prepare('INSERT OR IGNORE INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,?,1,?)').bind(data.user.id,b.email.trim().toLowerCase(),b.username.toLowerCase(),b.name.trim(),b.role,b.role==='student'?1:0,new Date().toISOString()).run();
  if(!inserted.meta?.changes){const saved=await env.DB.prepare('SELECT id,email FROM accounts WHERE id=?').bind(data.user.id).first();if(saved?.email===b.email.trim().toLowerCase())return json({ok:true,value:{message:'Your account profile is already saved. Check your email for verification, then sign in using your email address. Your existing role and permissions are unchanged.'}},200,headers);return errorResponse('Verify your email and sign in using your email address to complete your profile. Your existing account has not been changed.','onboarding',409,headers);}
  return json({ok:true,value:{message:b.role==='student'?'Account created. Check your email to verify it, then sign in.':'Account created. Verify your email; a convenor must enable your staff access before you can sign in to this portal.'}},200,headers);
 }
 if(action==='reset'){
  if(typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email))return errorResponse('Enter a valid account email.');
  const {error}=await client.auth.resetPasswordForEmail(b.email.trim(),{redirectTo:`${new URL(request.url).origin}/auth/confirm?next=/reset-password`});
  const deliveryError=emailDeliveryError(error,headers);if(deliveryError)return deliveryError;
  if(error)return errorResponse('Password recovery is temporarily unavailable. Please try again later.','delivery',503,headers);
  return json({ok:true,value:{message:'If an account exists for that email, password-reset instructions will be sent.'}},200,headers);
 }
 if(action==='complete-profile'){
  const {data,error}=await client.auth.getUser();if(error||!data.user?.email_confirmed_at||!data.user.email)return errorResponse('Verify your email and sign in before completing account details.','session',401,headers);
  if(typeof b.name!=='string'||!b.name.trim()||typeof b.username!=='string'||!/^[a-z0-9._-]{3,40}$/i.test(b.username)||!['student','mentor','sponsor','tutor','coordinator'].includes(b.role))return errorResponse('Provide your name, a valid unique username and requested role.');
  if(await env.DB.prepare('SELECT id FROM accounts WHERE id=?').bind(data.user.id).first())return errorResponse('Your profile is already saved. Sign in to check your access.','pending',409,headers);
  const inserted=await env.DB.prepare('INSERT OR IGNORE INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,?,1,?)').bind(data.user.id,data.user.email.toLowerCase(),b.username.toLowerCase(),b.name.trim(),b.role,b.role==='student'?1:0,new Date().toISOString()).run();
  if(!inserted.meta?.changes)return errorResponse('That username is unavailable. Choose another one.','username',409,headers);return json({ok:true,value:{message:b.role==='student'?'Profile saved. You can now sign in.':'Profile saved. A convenor must enable your staff access.'}},200,headers);
 }
 if(action==='update-password'){
  if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)return errorResponse('Use a new password of 12–128 characters.');
  const {data}=await client.auth.getUser();if(!data.user)return errorResponse('Your recovery session has expired. Request a new reset link.','session',401,headers);
  const recovery=parseCookieHeader(request.headers.get('cookie')||'').find(c=>c.name==='capstone-recovery')?.value;if(recovery!=='1')return errorResponse('Open your valid recovery link before changing a password.','session',401,headers);
  const {error}=await client.auth.updateUser({password:b.password});if(error)return errorResponse('The password could not be updated. Request a new recovery link.','recovery',400,headers);
  await client.auth.signOut({scope:'global'});headers.append('Set-Cookie',serializeCookieHeader('capstone-recovery','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:0}));return json({ok:true,value:{message:'Password updated. Sign in with your new password.'}},200,headers);
 }
 if(action==='logout'){const {error}=await client.auth.signOut();if(error)return errorResponse('Sign out could not reach the account service. Please retry.','session',503,headers);return json({ok:true,value:{}},200,headers);}
 return errorResponse('Unknown account operation.');
}


