import {describe,it,expect} from 'vitest';
import {authenticateDemo,readDemoSession} from './demoAuth';
import {createSeed} from './seed';
const users=createSeed().users;
describe('role-specific demo credentials',()=>{
 it.each([
  ['student','student','student-1'],['mentor','mentor','mentor-1'],
  ['sponsor','sponsor','sponsor-1'],['convener','convener','coordinator-1'],
 ] as const)('signs into the %s portal with matching credentials',(role,username,id)=>{
  const r=authenticateDemo(users,role,username,'Capstone2026!');expect(r.ok).toBe(true);if(r.ok)expect(r.value.id).toBe(id);
 });
 it('rejects a correct mentor password in the student portal',()=>expect(authenticateDemo(users,'student','mentor','Capstone2026!').ok).toBe(false));
 it('rejects an incorrect password',()=>expect(authenticateDemo(users,'student','student','wrong').ok).toBe(false));
 it('supports named student accounts for the group workflow',()=>{const r=authenticateDemo(users,'student','mia.thompson','Capstone2026!');expect(r.ok).toBe(true);if(r.ok)expect(r.value.id).toBe('student-6');});
 it('normalizes usernames while preserving password case',()=>{expect(authenticateDemo(users,'student',' STUDENT ','Capstone2026!').ok).toBe(true);expect(authenticateDemo(users,'student','student','capstone2026!').ok).toBe(false);});
 it('rejects missing or mismatched restored sessions',()=>{expect(readDemoSession(users,'{"userId":"mentor-1","role":"student"}')).toBeNull();expect(readDemoSession(users,'broken')).toBeNull();expect(readDemoSession(users,null)).toBeNull();});
});
