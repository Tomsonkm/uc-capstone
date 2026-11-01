import type {Metadata} from 'next';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/stix-two-text/latin-400.css';
import '@fontsource/stix-two-text/latin-600.css';
import '../src/styles/tokens.css';
import '../src/styles/global.css';
import '../src/styles/layout.css';
import '../src/styles/login.css';
import '../src/styles/catalogue.css';
import '../src/styles/platform.css';
export const metadata:Metadata={title:'University of Canberra | Capstone Project Management',description:'Connect student groups, sponsors, mentors, tutors and convenors through the capstone project lifecycle.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
