import type {AppState,Command,Result} from '../domain/types';
export interface Repository {snapshot():AppState;dispatch(actorId:string,command:Command):Result<AppState>;subscribe(listener:()=>void):()=>void;reset():void;persistenceStatus():'local'|'memory';recoveryNotice():string}
