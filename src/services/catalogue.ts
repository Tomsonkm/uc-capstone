import type {AppState,Project} from '../domain/types';
import sourceProjects from '../data/projects-s2-2026.json';

// The supplied list provides briefs, not account assignments or live allocations.
export const semesterProjects=sourceProjects as Project[];
export function withSemesterCatalogue(state:AppState):AppState{
 const existing=new Map(state.projects.map(p=>[p.id,p]));
 const imported=semesterProjects.map(p=>existing.get(p.id)??structuredClone(p));
 const retained=state.projects.filter(p=>!semesterProjects.some(source=>source.id===p.id)).map(p=>
  /^project-[1-8]$/.test(p.id)?{...p,catalogueArchive:true}:p);
 return {...state,projects:[...imported,...retained]};
}
