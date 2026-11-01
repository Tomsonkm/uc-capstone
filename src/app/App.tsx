import {BrowserRouter,Routes,Route,Navigate,Outlet,useLocation} from 'react-router-dom';
import {AppProvider,useCapstone} from './AppProvider';
import {PortalEntry} from './PortalEntry';
import {LoginPage,ResetPasswordPage} from './LoginPage';
import {Shell} from './Shell';
import {Overview} from '../features/overview/Overview';
import {ProjectCatalogue,ProjectDetail} from '../features/projects/Projects';
import {GroupPage} from '../features/groups/GroupPage';
import {PreferencesPage} from '../features/eoi/PreferencesPage';
import {RoundsPage} from '../features/allocation/AllocationPage';
import {WorkspacePage} from '../features/workspace/WorkspacePage';
import {Empty} from '../components/UI';
import {ProposalsPage} from '../features/administration/ProposalsPage';
import {InterestsPage} from '../features/administration/InterestsPage';
import {NotificationsPage} from '../features/administration/NotificationsPage';
import {ReportsPage} from '../features/administration/ReportsPage';
import {SponsorDecisions} from '../features/administration/SponsorDecisions';
import {MessagesPage} from '../features/communications/MessagesPage';
import {AccountsPage} from '../features/administration/AccountsPage';
import {DocumentsPage} from '../features/workspace/DocumentsPage';
import {ConvenorAllocation} from '../features/allocation/ConvenorAllocation';
function Guard(){const {actor}=useCapstone(),location=useLocation();if(!actor){const role=location.pathname.split('/')[1];return <Navigate to={['student','mentor','sponsor','coordinator','tutor'].includes(role)?`/login/${role==='coordinator'?'convener':role}`:'/'} replace/>;}if(!location.pathname.startsWith(`/${actor.role}/`))return <Navigate to={`/${actor.role}/overview`} replace/>;return <Outlet/>;}
export default function App(){return <AppProvider><BrowserRouter><Routes><Route path="/" element={<PortalEntry/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/><Route path="/login/:portal" element={<LoginPage/>}/><Route path="/convener/*" element={<Navigate to="/coordinator/overview" replace/>}/><Route element={<Guard/>}><Route path="/:role" element={<Shell/>}><Route path="overview" element={<Overview/>}/><Route path="projects" element={<ProjectCatalogue/>}/><Route path="projects/:projectId" element={<ProjectDetail/>}/><Route path="group" element={<StudentOnly><GroupPage/></StudentOnly>}/><Route path="preferences" element={<StudentOnly><PreferencesPage/></StudentOnly>}/><Route path="allocation" element={<CoordinatorOnly><ConvenorAllocation/></CoordinatorOnly>}/><Route path="proposals" element={<ProposalsPage/>}/><Route path="interests" element={<InterestsPage/>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="accounts" element={<AccountsPage/>}/><Route path="reports" element={<ReportsPage/>}/><Route path="decisions" element={<SponsorDecisions/>}/><Route path="documents" element={<ProjectParticipantsOnly><DocumentsPage/></ProjectParticipantsOnly>}/><Route path="messages" element={<MessagesPage/>}/><Route path="rounds" element={<CoordinatorOnly><RoundsPage/></CoordinatorOnly>}/><Route path="workspace" element={<ProjectParticipantsOnly><WorkspacePage/></ProjectParticipantsOnly>}/><Route path="workspace/:projectId" element={<ProjectParticipantsOnly><WorkspacePage/></ProjectParticipantsOnly>}/><Route path="*" element={<Empty title="This page has moved" description="Return to your overview to continue."/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter></AppProvider>;}
function ProjectParticipantsOnly({children}:{children:React.ReactNode}){const {actor}=useCapstone();return actor&&['student','mentor','sponsor'].includes(actor.role)?children:<Denied/>;}
function StudentOnly({children}:{children:React.ReactNode}){const {actor}=useCapstone();return actor?.role==='student'?children:<Denied/>;}
function StaffOnly({children}:{children:React.ReactNode}){const {actor}=useCapstone();return actor?.role==='mentor'||actor?.role==='coordinator'?children:<Denied/>;}
function CoordinatorOnly({children}:{children:React.ReactNode}){const {actor}=useCapstone();return actor?.role==='coordinator'?children:<Denied/>;}
function Denied(){return <Empty title="This page is for another role" description="Use your portal navigation to continue."/>;}
