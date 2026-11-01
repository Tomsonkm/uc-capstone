import {test,expect} from '@playwright/test';
test('public demonstration credentials never authenticate to the shared-record API',async({request})=>{
 const response=await request.post('/api/auth/login',{headers:{Origin:'http://127.0.0.1:5173'},data:{username:'student',password:'Capstone2026!',remember:false}});expect([401,503]).toContain(response.status());const body=await response.json();expect(body.ok).toBe(false);
 const data=await request.get('/api/session');expect([401,503]).toContain(data.status());expect((await data.json()).ok).toBe(false);
});
test('cross-origin requests cannot write to shared records',async({request})=>{const response=await request.post('/api/command',{headers:{Origin:'https://unrelated.example'},data:{operationId:'try',command:{type:'openRound',opensAt:'2026-10-01T00:00:00Z',closesAt:'2026-12-01T00:00:00Z'}}});expect(response.status()).toBe(403);expect(await response.text()).not.toContain('\"ok\":true');});
