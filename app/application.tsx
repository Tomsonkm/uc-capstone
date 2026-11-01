'use client';
import {useEffect,useState} from 'react';
import App from '../src/app/App';
export default function Application(){const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);return mounted?<App/>:<main className="page-content" role="status">Loading your capstone workspace…</main>;}
