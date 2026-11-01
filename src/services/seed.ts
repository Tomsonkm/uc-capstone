import type {AppState,Project,User,EOIChoice} from '../domain/types';
import {withSemesterCatalogue} from './catalogue';
import {hydratePlatform} from '../domain/platformWorkflow';
export function createSeed(now=new Date()):AppState{
 const stamp=now.toISOString(),ago=(days:number)=>new Date(now.getTime()-days*86400000).toISOString();
 const users:User[]=[
 {id:'student-1',name:'Alex Morgan',role:'student',skills:['React','TypeScript','UX research'],title:'Team leader · The Innovators'},
 {id:'student-2',name:'Priya Shah',role:'student',skills:['Python','SQL','Data analysis'],title:'The Innovators'},
 {id:'student-3',name:'James Wilson',role:'student',skills:['Figma','UX research','Testing'],title:'The Innovators'},
 {id:'student-4',name:'Sofia Chen',role:'student',skills:['React','Accessibility'],title:'Available to join a group'},
 {id:'student-5',name:'Noah Williams',role:'student',skills:['Python','Machine learning'],title:'Available to join a group'},
 {id:'student-6',name:'Mia Thompson',role:'student',skills:['React','SQL'],title:'Team leader · Blueprints'},
 {id:'student-7',name:'Oliver Lee',role:'student',skills:['TypeScript','Testing'],title:'Blueprints'},
 {id:'student-8',name:'Amelia Brown',role:'student',skills:['Figma','UX research'],title:'Blueprints'},
 {id:'student-9',name:'Ethan Davis',role:'student',skills:['Python','SQL'],title:'Team leader · Greenlight'},
 {id:'student-10',name:'Ava Patel',role:'student',skills:['Data analysis','React'],title:'Greenlight'},
 {id:'student-11',name:'Lucas Martin',role:'student',skills:['Testing','Figma'],title:'Greenlight'},
 {id:'mentor-1',name:'Dr Emma Taylor',role:'mentor',skills:[],title:'Capstone mentor'},
 {id:'coordinator-1',name:'Dr Daniel Brooks',role:'coordinator',skills:[],title:'Capstone convener'},
 {id:'sponsor-1',name:'Sarah Mitchell',role:'sponsor',skills:[],title:'Industry partner',company:'CivicLab'},
 {id:'sponsor-2',name:'David Park',role:'sponsor',skills:[],title:'Industry partner',company:'Greenline Energy'}
 ];
 users.push({id:'tutor-1',name:'Jordan Ellis',role:'tutor',skills:[],title:'Capstone tutor'});
 for(const u of users)u.email=`${u.name.toLowerCase().replace(/[^a-z]+/g,'.')}@example.edu`;
 const descriptions=[
 ['A more connected Canberra','Web development','CivicLab','Create an accessible platform that helps residents discover local services and connect with their community.',['React','TypeScript','UX research'],'city'],
 ['Better care, closer to home','Health technology','Northstar Health','Design a patient companion that makes care plans easier to understand and follow.',['React','Figma','Accessibility'],'health'],
 ['Making energy visible','Sustainability','Greenline Energy','Turn energy data into clear insights that help households make informed choices.',['Python','SQL','Data analysis'],'energy'],
 ['Learning without barriers','Education','OpenPath Learning','Build an inclusive learning workspace that adapts to different accessibility needs.',['React','Accessibility','Testing'],'learning'],
 ['Small business, big insights','Data & analytics','MarketThread','Help small businesses understand their customers with a practical analytics toolkit.',['Python','SQL','Data analysis'],'data'],
 ['A smarter way to travel','Web development','Move Canberra','Prototype a journey planner that brings accessible transport options together.',['TypeScript','UX research','Testing'],'travel'],
 ['Culture in your pocket','Design & experience','Archive Collective','Create a digital experience that makes a fictional local cultural collection easier to explore.',['Figma','React','UX research'],'culture'],
 ['Waterwise communities','Sustainability','Greenline Energy','Build a shared dashboard showing water usage trends and community conservation ideas.',['Python','Data analysis','Testing'],'water']
 ] as const;
 const projects:Project[]=descriptions.map((d,i)=>({id:`project-${i+1}`,title:d[0],category:d[1],sponsor:d[2],sponsorId:i===2||i===7?'sponsor-2':i===0?'sponsor-1':`archive-sponsor-${i+1}`,mentorId:'mentor-1',brief:d[3],skills:[...d[4]],outcomes:['A tested, accessible prototype','A documented technical approach','A final demonstration and project report'],status:i===7?'allocated':'published',cycleId:'cycle',art:d[5]}));
 for(const p of projects){if(!users.some(u=>u.id===p.sponsorId))users.push({id:p.sponsorId,name:p.sponsor,company:p.sponsor,role:'sponsor',skills:[]});}
 const competitor:EOIChoice[]=['project-1','project-2','project-4'].map((projectId,i)=>({projectId,rank:(i+1) as 1|2|3,suitability:'Our group combines React development, SQL and user research experience.',approach:'We will interview users, prototype the workflow, implement the core experience and test it.'}));
 return hydratePlatform(withSemesterCatalogue({version:1,users,projects,groups:[
 {id:'team-1',name:'The Innovators',cycleId:'cycle',leaderId:'student-1',memberIds:['student-1','student-2','student-3'],invitations:[]},
 {id:'team-2',name:'Blueprints',cycleId:'cycle',leaderId:'student-6',memberIds:['student-6','student-7','student-8'],invitations:[]},
 {id:'team-3',name:'Greenlight',cycleId:'cycle',leaderId:'student-9',memberIds:['student-9','student-10','student-11'],invitations:[]}
 ],rounds:[{id:'round-1',cycleId:'cycle',sequence:1,opensAt:ago(5),closesAt:new Date(now.getTime()+14*86400000).toISOString(),status:'open'}],eois:[{id:'eoi-2',groupId:'team-2',roundId:'round-1',choices:competitor,status:'submitted',firstSubmittedAt:ago(1),lastEditedAt:ago(1),members:users.filter(u=>['student-6','student-7','student-8'].includes(u.id)).map(u=>({name:u.name,skills:u.skills})),history:[{at:ago(1),body:'Application submitted'}]}],allocations:[{id:'allocation-3',projectId:'project-8',groupId:'team-3',mentorId:'mentor-1',createdAt:ago(5),rationale:'Relevant data analysis and testing skills.'}],records:[
 {id:'update-seed',projectId:'project-8',authorId:'student-9',type:'update',visibility:'shared',title:'Discovery and requirements',body:'We mapped the key user journeys and reviewed the sample water usage data.',next:'Create a dashboard prototype and validate it with our sponsor.',blockers:'We need feedback on the most useful time range.',createdAt:ago(1)},
 {id:'message-seed',projectId:'project-8',authorId:'sponsor-2',type:'message',visibility:'shared',body:'The weekly view looks useful. Let’s include a comparison with the previous month.',createdAt:ago(1)},
 {id:'meeting-seed',projectId:'project-8',authorId:'student-9',type:'meeting',visibility:'shared',title:'Prototype walkthrough',body:'Review the first dashboard concepts together.',meetingAt:new Date(now.getTime()+3*86400000).toISOString(),status:'pending',createdAt:stamp}
 ],history:[]}));
}
