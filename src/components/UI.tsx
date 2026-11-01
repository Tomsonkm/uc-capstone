import type {ReactNode} from 'react';
import {ArrowUpRight,FolderOpen} from 'lucide-react';
import {Link} from 'react-router-dom';
export function PageHeader({title,description,children}:{title:string;description:string;children?:ReactNode}){return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children}</header>;}
export function Empty({title,description,children}:{title:string;description:string;children?:ReactNode}){return <div className="empty"><FolderOpen size={30} color="var(--ocean)"/><h2>{title}</h2><p className="muted">{description}</p>{children}</div>;}
export function StatusLabel({status}:{status:string}){return <span className={`pill ${/allocated|complete|confirmed|ready|published/i.test(status)?'success':/pending|submitted|review|draft|forming/i.test(status)?'warning':''}`}>{status.replace(/^./,x=>x.toUpperCase())}</span>;}
export function TextLink({to,children}:{to:string;children:ReactNode}){return <Link className="text-link" to={to}>{children}<ArrowUpRight size={16}/></Link>;}
export function Skills({skills}:{skills:string[]}){return <div className="tags">{skills.map(s=><span className="tag" key={s}>{s}</span>)}</div>;}
