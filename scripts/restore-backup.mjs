import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const args=process.argv.slice(2),file=args[0],out=args.indexOf('--output');
if(!file){process.stderr.write('Usage: node scripts/restore-backup.mjs snapshot.json [--output outputs/recovered.sqlite]\nWithout --output, validates only. Existing databases are never overwritten.\n');process.exit(2);}
const snapshot=JSON.parse(readFileSync(file,'utf8'));
if(snapshot.format!=='uc-capstone-backup'||snapshot.version!==1||snapshot.sha256!==createHash('sha256').update(JSON.stringify(snapshot.payload)).digest('hex'))throw Error('Invalid backup format or checksum.');
const collections=['users','groups','projects','rounds','eois','allocations','records','history','proposals','interests','notifications','channels','messages','documents','tasks','exceptions','allocationDrafts','sponsorDecisions','audit'];
for(const key of ['users','groups','projects','rounds','eois','allocations','records'])if(!Array.isArray(snapshot.payload.state[key]))throw Error(`Missing collection: ${key}`);
const projects=new Set(snapshot.payload.state.projects.map(p=>p.id)),groups=new Set(snapshot.payload.state.groups.map(g=>g.id));if(snapshot.payload.state.allocations.some(a=>!projects.has(a.projectId)||!groups.has(a.groupId)))throw Error('Invalid allocation references.');
if(!Array.isArray(snapshot.payload.accounts)||snapshot.payload.accounts.some(a=>['password','encrypted_password','access_token','refresh_token','secret'].some(k=>k in a)))throw Error('Invalid account data.');
if(out<0){process.stdout.write(`Backup verified: ${projects.size} projects, ${groups.size} groups. No data changed.\n`);process.exit(0);}
const target=resolve(args[out+1]||'');if(!args[out+1]||existsSync(target))throw Error('Choose a new, non-existing output database path.');
const db=new DatabaseSync(target);try{db.exec(readFileSync(new URL('../drizzle/0000_platform.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));db.exec('BEGIN');db.prepare('INSERT INTO semesters (id,revision,mutation) VALUES (?,0,?)').run('2026-S2','restore');
for(const collection of collections)for(const [index,value] of (snapshot.payload.state[collection]||[]).entries()){db.prepare('INSERT INTO entities (collection,id,body) VALUES (?,?,?)').run(collection,value.id||String(index).padStart(10,'0'),JSON.stringify(value));}
for(const a of snapshot.payload.accounts)db.prepare('INSERT INTO accounts (id,email,username,name,role,approved,active,created_at) VALUES (?,?,?,?,?,?,?,?)').run(a.id,a.email,a.username,a.name,a.role,a.approved,a.active,a.created_at);
db.exec('COMMIT');process.stdout.write(`Restored into isolated database: ${target}\nPrivate file objects remain in R2 under their original version keys. Verify their presence before any operational recovery.\n`);}catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}finally{db.close();}
