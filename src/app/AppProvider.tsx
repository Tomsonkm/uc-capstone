import {createContext,useContext,useMemo,useState,useSyncExternalStore,useEffect,useRef,type ReactNode} from 'react';
import {createLocalRepository} from '../services/localRepository';
import {authenticateDemo,restoreDemoSession,saveDemoSession,clearDemoSession,type PortalRole} from '../services/demoAuth';
import {visibleState} from '../domain/workflow';
import {apiRequest,fetchServerSession,sendServerCommand,type ServerSession} from '../services/apiRepository';
import type {AppState,Command,Result,User} from '../domain/types';
interface Context {state:AppState;actor:User|null;dispatch:(c:Command)=>Promise<Result<AppState>>;signIn:(portal:PortalRole,username:string,password:string,remember?:boolean)=>Promise<Result<User>>;signOut:()=>Promise<void>;personas:User[];reset:()=>void;notice:string;toast:string;notify:(message:string)=>void;demo:boolean;enableDemo:()=>void;disableDemo:()=>void;refresh:()=>Promise<void>;busy:boolean}
const Capstone=createContext<Context|null>(null);
export function AppProvider({children}:{children:ReactNode}){
 const [repo]=useState(()=>{let storage:Storage|null=null;try{storage=window.localStorage;}catch{}return createLocalRepository(storage,()=>new Date());});
 const raw=useSyncExternalStore(repo.subscribe,repo.snapshot),[demo,setDemo]=useState(()=>{try{return sessionStorage.getItem('uc-demo-enabled')==='1';}catch{return false;}}),[actorId,setActorId]=useState(()=>restoreDemoSession(repo.snapshot().users)?.id||''),[remote,setRemote]=useState<ServerSession|null>(null),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),inFlight=useRef(new Map<string,Promise<Result<AppState>>>());
 const actor=demo?raw.users.find(u=>u.id===actorId)||null:remote?.actor||null,state=useMemo(()=>demo?visibleState(raw,actorId):remote?.state||visibleState(raw,''),[raw,actorId,demo,remote]);
 const notify=(message:string)=>setToast(message);
 const refresh=async()=>{if(demo)return;const r=await fetchServerSession();if(r.ok)setRemote(r.value);else if(['session','pending','permission'].includes(r.code)){setRemote(null);setToast(r.message);}};
 useEffect(()=>{if(demo)return;void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},15000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[demo]);
 const enableDemo=()=>{setDemo(true);setRemote(null);setActorId('');try{sessionStorage.setItem('uc-demo-enabled','1');}catch{};};
 const disableDemo=()=>{clearDemoSession();try{sessionStorage.removeItem('uc-demo-enabled');}catch{}setDemo(false);setActorId('');setRemote(null);setToast('');};
 const signIn=async(portal:PortalRole,username:string,password:string,remember=false):Promise<Result<User>>=>{
  if(demo){const r=authenticateDemo(raw.users,portal,username,password);if(r.ok){setActorId(r.value.id);saveDemoSession(r.value);setToast('');}return r;}
  setBusy(true);try{const login=await apiRequest('/api/auth/login',{username,password,remember});if(!login.ok)return login;const r=await fetchServerSession();if(!r.ok){if(r.code==='pending'&&r.message.includes('Complete'))return {ok:false,code:'onboarding',message:r.message};return r;}
   const role=portal==='convener'?'coordinator':portal;if(r.value.actor.role!==role){await apiRequest('/api/auth/logout',{});return {ok:false,code:'permission',message:'This account is not approved for the selected portal.'};}setRemote(r.value);return {ok:true,value:r.value.actor};
  }finally{setBusy(false);}
 };
 const signOut=async()=>{if(!demo){const r=await apiRequest('/api/auth/logout',{});if(!r.ok){notify(r.message);return;}}setActorId('');setRemote(null);clearDemoSession();setToast('');};
 const dispatch=(c:Command):Promise<Result<AppState>>=>{const key=JSON.stringify(c),pending=inFlight.current.get(key);if(pending)return pending;
  const operation=(async()=>{await Promise.resolve();setBusy(true);try{if(demo){const r=repo.dispatch(actorId,c);return r.ok?{ok:true as const,value:visibleState(r.value,actorId)}:r;}const r=await sendServerCommand(c,crypto.randomUUID());if(r.ok){setRemote(r.value);return {ok:true as const,value:r.value.state};}return r;}finally{setBusy(false);inFlight.current.delete(key);}})();inFlight.current.set(key,operation);return operation;};
 return <Capstone.Provider value={{state,actor,dispatch,signIn,signOut,personas:demo?raw.users:[],reset:repo.reset,notice:demo?repo.recoveryNotice():'',toast,notify,demo,enableDemo,disableDemo,refresh,busy}}>{children}</Capstone.Provider>;
}
export function useCapstone(){const v=useContext(Capstone);if(!v)throw Error('Capstone provider missing');return v;}
