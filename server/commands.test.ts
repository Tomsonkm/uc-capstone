import {it,expect} from 'vitest';
import {validCommand} from './commands';
it('accepts group deletion and only recognised unit codes',()=>{
 expect(validCommand({type:'deleteGroup',groupId:'group-1'})).toBe(true);expect(validCommand({type:'setGroupUnit',groupId:'group-1',unitCode:'11522'})).toBe(true);expect(validCommand({type:'setGroupUnit',groupId:'group-1',unitCode:'99999'})).toBe(false);
});
it('rejects malformed nested choices, unrecognised mutations and invented decision values',()=>{expect(validCommand({type:'saveDraft',groupId:'g',roundId:'r',choices:[{projectId:'p',rank:1,suitability:{bad:true},approach:''}]})).toBe(false);expect(validCommand({type:'allocate',groupId:'g',projectId:'p',rationale:'bypass confirmation'})).toBe(false);expect(validCommand({type:'correctMembers',groupId:'g',memberIds:[]})).toBe(false);expect(validCommand({type:'reviewProposal',proposalId:'p',decision:'published',reason:'Bypass approval'})).toBe(false);expect(validCommand({type:'sendMessage',channelId:'ch',body:'Hello',actorId:'someone-else'})).toBe(false);expect(validCommand({type:'sendMessage',channelId:'ch',body:'Hello'})).toBe(true);});
