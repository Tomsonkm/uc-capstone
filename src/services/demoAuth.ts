import type {Result, Role, User} from '../domain/types';

export type PortalRole = 'student' | 'mentor' | 'sponsor' | 'convener' | 'tutor';
export const DEMO_PASSWORD = 'Capstone2026!';
const SESSION_KEY = 'uc-demo-session';

export const portals: {slug: PortalRole; role: Role; label: string; description: string; username: string}[] = [
  {slug:'student',role:'student',label:'Student',description:'Find your project and build your team.',username:'student'},
  {slug:'mentor',role:'mentor',label:'Mentor',description:'Guide assigned groups and review their progress.',username:'mentor'},
  {slug:'sponsor',role:'sponsor',label:'Sponsor',description:'Follow progress and share feedback.',username:'sponsor'},
  {slug:'convener',role:'coordinator',label:'Convener',description:'Manage projects, rounds and allocations.',username:'convener'},
  {slug:'tutor',role:'tutor',label:'Tutor',description:'Express tutoring interest and contact the convenor.',username:'tutor'},
];

const primaryAccounts: Record<PortalRole,string> = {
  student:'student-1',mentor:'mentor-1',sponsor:'sponsor-1',convener:'coordinator-1',tutor:'tutor-1',
};
export function portalForRole(role:Role){return portals.find(p=>p.role===role)!;}
export function demoUsername(user:User){return user.name.replace(/^Dr\s+/,'').toLowerCase().trim().replace(/\s+/g,'.');}

// These public credentials exercise the browser-local demo, not production authentication.
export function authenticateDemo(users:User[], portal:PortalRole, username:string, password:string):Result<User>{
  const config=portals.find(p=>p.slug===portal);
  const normalized=username.trim().toLowerCase();
  const user=config&&users.find(u=>u.role===config.role&&(demoUsername(u)===normalized||(config.username===normalized&&u.id===primaryAccounts[portal])));
  if(!user||password!==DEMO_PASSWORD)return {ok:false,code:'credentials',message:'Username or password is incorrect for this portal.'};
  return {ok:true,value:user};
}

export function readDemoSession(users:User[], raw:string|null):User|null{
  try{
    if(!raw)return null;
    const session=JSON.parse(raw);
    return users.find(u=>u.id===session.userId&&u.role===session.role)||null;
  }catch{return null;}
}
export function restoreDemoSession(users:User[]){
  try{return readDemoSession(users,sessionStorage.getItem(SESSION_KEY));}catch{return null;}
}
export function saveDemoSession(user:User){
  try{sessionStorage.removeItem('uc-persona');sessionStorage.setItem(SESSION_KEY,JSON.stringify({userId:user.id,role:user.role}));}catch{/* In-memory demo access remains usable when browser storage is disabled. */}
}
export function clearDemoSession(){
  try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem('uc-persona');}catch{/* Signing out still clears the in-memory account. */}
}
