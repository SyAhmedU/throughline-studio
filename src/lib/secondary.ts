import type {Dataset} from './dataset';
export interface SecondaryPlan {source:string;version:string;licence:string;population:string;unit:string;coverage:string;codebook:string;variables:string;missingCodes:string;selection:string;robustness:string;key:string}
export const emptySecondary=():SecondaryPlan=>({source:'',version:'',licence:'',population:'',unit:'',coverage:'',codebook:'',variables:'',missingCodes:'',selection:'',robustness:'',key:''});
export function auditSecondary(d:Dataset,key:string){
 const index=d.variables.findIndex(v=>v.name===key),seen=new Set<string>();let duplicateKeys=0,missingKeys=0;
 const blank=(v:unknown)=>v===null||v===undefined||v==='';
 if(index>=0)for(const row of d.rows){const v=row[index];if(blank(v)){missingKeys++;continue;}const token=JSON.stringify(v);if(seen.has(token))duplicateKeys++;else seen.add(token);}
 return {rows:d.rows.length,duplicateKeys,missingKeys,keyChecked:index>=0,columns:d.variables.map((v,j)=>({name:v.name,missing:d.rows.filter(r=>blank(r[j])).length,nonnumeric:d.rows.filter(r=>!blank(r[j])&&typeof r[j]!=='number').length}))};
}
export function secondaryReport(p:SecondaryPlan,d:Dataset|null){return ['# Secondary-data research record',`Recorded: ${new Date().toISOString()}`,'Researcher-supplied provenance and plans; not independently verified.',...Object.entries(p).map(([k,v])=>`## ${k}\n${v||'NOT RECORDED'}`),d?`## Loaded-data audit\nDataset: ${d.name}${d.simulated?' · SIMULATED':''}\n${JSON.stringify(auditSecondary(d,p.key),null,2)}`:'No dataset loaded.','No transformations or joins were executed by this planning record. Audit detects blank cells only; source-specific missing codes require explicit handling.'].join('\n\n');}
