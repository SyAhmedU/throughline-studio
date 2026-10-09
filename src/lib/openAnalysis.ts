import type {Dataset} from './dataset';
export function toolsDataset(ds:Dataset){
  const rows=ds.rows.map(row=>Object.fromEntries(ds.variables.map((v,i)=>[v.name,row[i]??null])));
  const variables=ds.variables.map(v=>({name:v.name,type:v.type,missing:rows.filter(r=>r[v.name]==null||r[v.name]==='').length}));
  return {name:ds.name,source:ds.simulated?'demo':'upload',variables,rows};
}
export async function toolsHash(ds:Dataset){const d=toolsDataset(ds);const input=JSON.stringify({variables:d.variables,rows:d.rows.map(r=>d.variables.map(v=>r[v.name]??null))});return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export interface ImportedOpenRun {id:string;at:string;hash:string;workflow:string;datasetName:string;report:string;versions:Record<string,string>;warnings:string[];matchedDataset:boolean}
export async function importOpenRun(text:string,ds:Dataset|null):Promise<ImportedOpenRun>{
  if(text.length>2_000_000)throw Error('Run exceeds the 2 MB import limit. Keep the complete ZIP externally and import a concise result record.');
  const r=JSON.parse(text);
  if(r.schema!=='toolsscope-open-run-1'||typeof r.id!=='string'||typeof r.at!=='string'||typeof r.hash!=='string'||!/^[a-f0-9]{64}$/.test(r.hash)||typeof r.report!=='string'||r.report.length>500000||!r.result||!r.result.versions||!Array.isArray(r.result.warnings)||!['sem','invariance','growth','mediation','mixed','impute','meta','panel'].includes(r.spec?.workflow))throw Error('Not a valid ToolsScope open-engine run.');
  return {id:r.id,at:r.at,hash:r.hash,workflow:r.spec.workflow,datasetName:String(r.datasetName),report:r.report,versions:r.result.versions,warnings:r.result.warnings.map(String),matchedDataset:!!ds&&await toolsHash(ds)===r.hash};
}
