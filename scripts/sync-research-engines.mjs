// Canonical analysis source lives in sibling ToolsScope. Commit snapshots so this
// independent project can build without sibling checkouts in deployment.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');const source=resolve(root,'../toolsscope/src');const target=resolve(root,'src/vendor/toolsscope');
const files=['lib/open-engine.ts','lib/open-workflows.ts','lib/journal-evidence.json','lib/types.ts','lib/advanced.ts','lib/stats.ts','components/OpenWorkbench.tsx','components/OpenWorkbench.css','components/MethodVisuals.tsx','components/ResearchLab.css'];
const hashes={};for(const f of files){const body=Buffer.from(readFileSync(resolve(source,f),'utf8').replace(/\r\n/g,'\n')); mkdirSync(resolve(target,f,'..'),{recursive:true});writeFileSync(resolve(target,f),body);hashes[f]=createHash('sha256').update(body).digest('hex');}
writeFileSync(resolve(target,'lib/report.ts'),`// Adapter: only the browser download primitive is needed by the embedded workbench.\nexport function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}\n`);
writeFileSync(resolve(target,'SOURCE.json'),JSON.stringify({canonical:'SyAhmedU/toolsscope',files:hashes},null,2));console.log('Synced',files.length,'canonical files; standalone Studio build retained.');
