import type {AppState,Command,Result,User} from '../domain/types';
export interface ServerSession {actor:User;state:AppState}
export async function apiRequest<T>(path:string,body?:unknown):Promise<Result<T>>{
 try{const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json() as any;if(result&&typeof result.ok==='boolean')return result;return {ok:false,code:'server',message:'The server returned an unexpected response. Please try again.'};}
 catch{return {ok:false,code:'network',message:'The request could not be saved. Check your connection and try again. Your input has been kept.'};}
}
export const fetchServerSession=()=>apiRequest<ServerSession>('/api/session');
export const sendServerCommand=(command:Command,operationId:string)=>apiRequest<ServerSession>('/api/command',{command,operationId});
