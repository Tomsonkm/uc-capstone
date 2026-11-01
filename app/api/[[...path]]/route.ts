import {env} from 'cloudflare:workers';
import {handleAPI} from '../../../server/api';
import type {Runtime} from '../../../server/auth';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handleAPI(request,env as unknown as Runtime);
export const POST=(request:Request)=>handleAPI(request,env as unknown as Runtime);
