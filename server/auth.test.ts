// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {authReady,authenticationAction,authClient,sameOrigin} from './auth';
it('requests recovery with the live callback and stores a secure browser verifier',async()=>{
 const fetchMock=vi.fn(async()=>new Response('{}',{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test',DB:{},BUCKET:{}};
 const response=await authenticationAction(new Request('https://capstone.example/api/auth/reset',{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json'},body:JSON.stringify({email:'person@example.edu'})}),env,'reset');
 expect(response.status).toBe(200);const [url,options]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];expect(String(url)).toContain(encodeURIComponent('https://capstone.example/auth/confirm?next=/reset-password'));expect(JSON.parse(String(options.body))).toMatchObject({code_challenge_method:'s256'});
 expect(response.headers.get('set-cookie')).toContain('HttpOnly');expect(response.headers.get('set-cookie')).toContain('Secure');
 }finally{vi.unstubAllGlobals();}
});
it('refuses password changes from a normal signed-in session without recovery access',async()=>{
 const user={id:'mock-user',aud:'authenticated',email:'person@example.edu',email_confirmed_at:new Date().toISOString()};
 const fetchMock=vi.fn(async(input:any)=>new Response(JSON.stringify(String(input).includes('/token')?{access_token:'mock-access-token',refresh_token:'mock-refresh-token',token_type:'bearer',expires_in:3600,user}:user),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test',DB:{},BUCKET:{}},auth=authClient(new Request('https://capstone.example'),env);
 await auth.client.auth.signInWithPassword({email:'person@example.edu',password:'Only-a-mocked-password'});const cookie=auth.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const response=await authenticationAction(new Request('https://capstone.example/api/auth/update-password',{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json',cookie},body:JSON.stringify({password:'Only-a-mocked-new-password'})}),env,'update-password');
 expect(response.status).toBe(401);expect((await response.json() as any).message).toContain('recovery link');expect(fetchMock.mock.calls.some((call:any)=>call[1]?.method==='PUT')).toBe(false);
 }finally{vi.unstubAllGlobals();}
});
it('fails closed without a provider and rejects requests from another origin',async()=>{
 const env:any={DB:{},BUCKET:{}};expect(authReady(env)).toBe(false);
 const r=await authenticationAction(new Request('https://example.com/api/auth/login',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'}),env,'login');expect(r.status).toBe(503);expect((await r.json() as any).ok).toBe(false);
 expect(sameOrigin(new Request('https://example.com/api/command',{headers:{Origin:'https://evil.example'}}))).toBe(false);
});
it.each(['register','reset'])('explains email send limits during %s without recording an account',async(action)=>{
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'}),{status:429,headers:{'Content-Type':'application/json','X-Supabase-Api-Version':'2024-01-01'}}));vi.stubGlobal('fetch',fetchMock);
 const insert=vi.fn();
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test-publishable-key',DB:{prepare:()=>({bind:()=>({first:async()=>null,run:insert})})},BUCKET:{}};
 const response=await authenticationAction(new Request(`https://capstone.example/api/auth/${action}`,{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json'},body:JSON.stringify({name:'New Person',username:'new-person',email:'new@example.edu',password:'A-long-test-password',role:'student'})}),env,action);
 expect(response.status).toBe(429);expect(await response.json()).toMatchObject({ok:false,code:'email_rate_limit',message:expect.stringContaining('email sending limit')});expect(insert).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('checks duplicate username before creating an authentication identity',async()=>{
 const fetchMock=vi.fn(async()=>new Response('{"error":"unavailable"}',{status:500,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test-publishable-key',DB:{prepare:()=>({bind:()=>({first:async()=>({id:'existing'})})})},BUCKET:{}};
 const response=await authenticationAction(new Request('https://capstone.example/api/auth/register',{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json'},body:JSON.stringify({name:'New Person',username:'taken-name',email:'new@example.edu',password:'A-long-test-password',role:'student'})}),env,'register');expect(response.status).toBe(409);expect(fetchMock).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('a repeated unverified signup does not fail when the same profile is already saved',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({id:'existing-user',email:'new@example.edu',identities:[{id:'identity'}]}),{headers:{'Content-Type':'application/json'}})));
 const run=vi.fn(async()=>({meta:{changes:0}}));
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test',DB:{prepare:()=>({bind:()=>({first:async()=>({id:'existing-user',email:'new@example.edu'}),run})})},BUCKET:{}};
 const response=await authenticationAction(new Request('https://capstone.example/api/auth/register',{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json'},body:JSON.stringify({name:'New Person',username:'new-person',email:'new@example.edu',password:'A-long-test-password',role:'student'})}),env,'register');
 expect(response.status).toBe(200);expect((await response.json() as any).value.message).toContain('email');
 }finally{vi.unstubAllGlobals();}
});
it.each(['student','coordinator','mentor','sponsor','tutor'])('uses simple signup with safe initial access for %s',async(role)=>{
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({id:'new-user',email:'new@example.edu',identities:[{id:'identity'}]}),{status:200,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 const run=vi.fn(async()=>({meta:{changes:1}})),bind=vi.fn((..._values:unknown[])=>({first:async()=>null,run}));
 try{const env:any={SUPABASE_URL:'https://auth.example',SUPABASE_PUBLISHABLE_KEY:'test-publishable-key',DB:{prepare:()=>({bind})},BUCKET:{}};
 const response=await authenticationAction(new Request('https://capstone.example/api/auth/register',{method:'POST',headers:{Origin:'https://capstone.example','Content-Type':'application/json'},body:JSON.stringify({name:'New Person',username:'new-person',email:'new@example.edu',password:'A-long-test-password',role})}),env,'register');
 expect(response.status).toBe(200);expect(bind.mock.calls.at(-1)?.[5]).toBe(role==='student'?1:0);
 expect((await response.json() as any).value.message).toContain(role==='student'?'sign in':'staff access');
 }finally{vi.unstubAllGlobals();}
});


