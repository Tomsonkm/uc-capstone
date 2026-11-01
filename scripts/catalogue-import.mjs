import {readFileSync,writeFileSync} from 'node:fs';
const output=process.argv[2];if(!output){process.stderr.write('Usage: node scripts/catalogue-import.mjs outputs/catalogue-import.sql\n');process.exit(2);}
const projects=JSON.parse(readFileSync(new URL('../src/data/projects-s2-2026.json',import.meta.url),'utf8')),quote=value=>`'${String(value).replaceAll("'","''")}'`;
const sql=["INSERT OR IGNORE INTO semesters(id,revision,mutation) VALUES('2026-S2',0,'');",...projects.map(p=>`INSERT OR IGNORE INTO entities(collection,id,body) VALUES('projects',${quote(p.id)},${quote(JSON.stringify(p))});`)];writeFileSync(output,sql.join('\n')+'\n');process.stdout.write(`Prepared an idempotent import of ${projects.length} source projects.\n`);
