import {useEffect,useState,useRef} from 'react';

import type {Dataset} from '../lib/types';

import {WORKFLOWS,JOURNAL_PAPERS,JOURNAL_POLICIES,COMPANION_TOOLS} from '../lib/open-workflows';

import type {WorkflowId} from '../lib/open-workflows';

import {defaultOpenSpec,executeOpen,resetOpenEngine,prepareOpen} from '../lib/open-engine';

import type {OpenSpec,OpenRun,TableCell} from '../lib/open-engine';

import {fingerprint} from '../lib/advanced';

import {downloadBlob} from '../lib/report';

import './OpenWorkbench.css';

import MethodVisuals from './MethodVisuals';



const STORE='toolsscope_open_runs_v1';

const print=(v:TableCell|undefined)=>typeof v==='number'?Number.isFinite(v)?v.toLocaleString(undefined,{maximumSignificantDigits:6}):'Undefined':v==null?'—':String(v);

const download=(v:unknown,name:string)=>downloadBlob(new Blob([typeof v==='string'?v:JSON.stringify(v,null,2)],{type:typeof v==='string'?'text/plain':'application/json'}),name);

function initialSpec(){const s=defaultOpenSpec();const id=new URLSearchParams(location.search).get('workflow');if(WORKFLOWS.some(w=>w.id===id))s.workflow=id as WorkflowId;return s;}



function ResultChart({run}:{run:OpenRun}) {

  const records=run.result.tables.coefficients||run.result.tables.parameters||[];

  const estimates=records.filter(r=>typeof (r.estimate??r.est)==='number'&&typeof (r.low??r['ci.lower'])==='number'&&typeof (r.high??r['ci.upper'])==='number').map(r=>({label:String(r.term||`${r.lhs} ${r.op} ${r.rhs}`),b:Number(r.estimate??r.est),lo:Number(r.low??r['ci.lower']),hi:Number(r.high??r['ci.upper'])})).filter(r=>[r.b,r.lo,r.hi].every(Number.isFinite)).slice(0,40);

  if(!estimates.length)return null;

  const lo=Math.min(0,...estimates.map(r=>r.lo)),hi=Math.max(0,...estimates.map(r=>r.hi));const x=(n:number)=>190+400*(n-lo)/(hi-lo||1);

  return <figure className="open-chart"><figcaption>Engine estimates and 95% intervals · first {estimates.length} eligible parameters</figcaption><svg viewBox={`0 0 640 ${estimates.length*32+40}`} role="img" aria-label="Parameter estimates and confidence intervals; exact values available in the results tables"><line x1={x(0)} x2={x(0)} y1="0" y2={estimates.length*32} stroke="currentColor" opacity=".25" strokeDasharray="4 4"/>{estimates.map((r,i)=><g key={i}><text x="4" y={i*32+21} fontSize="11" fill="currentColor">{r.label.slice(0,27)}</text><line x1={x(r.lo)} x2={x(r.hi)} y1={i*32+17} y2={i*32+17} stroke="#9270F4" strokeWidth="3"/><circle cx={x(r.b)} cy={i*32+17} r="4" fill="currentColor"/></g>)}<text x="190" y={estimates.length*32+25} fontSize="11" fill="currentColor">{print(lo)}</text><text x="590" textAnchor="end" y={estimates.length*32+25} fontSize="11" fill="currentColor">{print(hi)}</text></svg></figure>;

}



export default function OpenWorkbench({dataset,onRun,storageKey=STORE,initialWorkflow,initialRuns=[],embedded=false}:{dataset:Dataset|null;onRun?:(run:OpenRun)=>void;storageKey?:string;initialWorkflow?:WorkflowId;initialRuns?:OpenRun[];embedded?:boolean}) {

  const attempt=useRef(0);
  useEffect(()=>()=>{attempt.current++;resetOpenEngine();},[]);

  const [spec,setSpec]=useState<OpenSpec>(()=>({...initialSpec(),...(initialWorkflow?{workflow:initialWorkflow}:{})})),[runs,setRuns]=useState<OpenRun[]>(()=>{try{const r=initialRuns.length?initialRuns:JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(r)?r.filter(x=>x.schema==='toolsscope-open-run-1'&&x.result&&x.mapping&&x.spec):[];}catch{return[];}});

  const [active,setActive]=useState(''),[table,setTable]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[saveError,setSaveError]=useState(''),[hash,setHash]=useState<string|null>(null),[includeData,setIncludeData]=useState(false),[journal,setJournal]=useState('all');

  const workflow=WORKFLOWS.find(w=>w.id===spec.workflow)!,run=runs.find(r=>r.id===active)||runs.at(-1);

  const numeric=dataset?.variables.filter(v=>['numeric','likert'].includes(v.type)).map(v=>v.name)||[],columns=dataset?.variables.map(v=>v.name)||[];

  useEffect(()=>{let current=true;setHash(null);if(dataset)fingerprint(dataset).then(h=>{if(current)setHash(h);}).catch(e=>setError(String(e)));return()=>{current=false;};},[dataset]);

  useEffect(()=>{if(initialWorkflow&&!busy)setSpec(s=>({...s,workflow:initialWorkflow}));},[initialWorkflow,busy]);

  const patch=(p:Partial<OpenSpec>)=>setSpec({...spec,...p});

  function choose(label:string,key:'outcome'|'group'|'time'|'x'|'mediator'|'variance'|'slope',choices=columns,optional=false){return <label className="lab-field">{label}<select value={spec[key]} onChange={e=>patch({[key]:e.target.value})}><option value="">{optional?'None':'Select…'}</option>{choices.map(v=><option key={v}>{v}</option>)}</select></label>;}

  function multi(label:string,key:'predictors'|'ordered'|'waves'|'auxiliary',choices=numeric){return <fieldset><legend>{label}</legend><div className="lab-checks">{choices.map(v=><label key={v}><input type="checkbox" checked={spec[key].includes(v)} onChange={e=>{const values=e.target.checked?[...spec[key],v]:spec[key].filter(x=>x!==v);patch({[key]:values,...(key==='waves'?{times:values.map((_,i)=>i)}:{})});}}/>{v}</label>)}</div></fieldset>;}

  async function execute(){if(!dataset)return;const token=++attempt.current;setBusy(true);setError('');try{const result=await executeOpen(dataset,spec,s=>{if(token===attempt.current)setStatus(s)});if(token!==attempt.current)return;const next=[...runs,result];setRuns(next);setActive(result.id);setTable('');onRun?.(result);try{localStorage.setItem(storageKey,JSON.stringify(next));setSaveError('');}catch{setSaveError('Browser storage is full. This result remains in this session; download the bundle before closing.');}setStatus('Completed with actual R output. Inspect warnings before interpretation.');}catch(e){if(token!==attempt.current)return;setError(e instanceof Error?e.message:String(e));setStatus('Run did not complete; previous results retained.');}finally{if(token===attempt.current)setBusy(false);}}

  async function exportBundle(){if(!run)return;setError('');try{

    const {default:JSZip}=await import('jszip');const zip=new JSZip();

    zip.file('run.json',JSON.stringify(run,null,2));zip.file('analysis.R',run.script);zip.file('results.json',JSON.stringify(run.result,null,2));zip.file('report.md',run.report);zip.file('variables.json',JSON.stringify(run.mapping,null,2));zip.file('versions.json',JSON.stringify(run.result.versions,null,2));zip.file('sessionInfo.txt',run.result.session.join('\n'));

    let dataIncluded=false;

    if(dataset&&await fingerprint(dataset)===run.hash){const p=prepareOpen(dataset,run.spec);zip.file('spec.json',p.specJSON);if(includeData){zip.file('data.csv',p.csv);dataIncluded=true;}}

    else {const names=run.mapping.map(v=>({name:v.name,type:v.type as Dataset['variables'][number]['type'],missing:0}));const placeholder:Dataset={name:run.datasetName,source:'upload',variables:names,rows:Array.from({length:5},()=>Object.fromEntries(names.map(v=>[v.name,null])))};zip.file('spec.json',prepareOpen(placeholder,run.spec).specJSON);}

    zip.file('README.txt',`ToolsScope actual R package analysis\nRun ${run.id}\nDataset hash ${run.hash}\nData included: ${dataIncluded}\n\nExtract files into a private folder. Install jsonlite and ${WORKFLOWS.find(w=>w.id===run.spec.workflow)!.package} in R, compare installed versions against versions.json, set the working directory to this folder and source('analysis.R').\nIf data.csv is omitted, supply the matching dataset using the v1/v2 alias mapping and original row order.\nThe script uses the actual packages, not a reimplementation. Preserve sessionInfo.txt and warnings. No publication or validity guarantee.\nSoftware citations are included in report.md.\n`);

    downloadBlob(await zip.generateAsync({type:'blob'}),`research-${run.spec.workflow}-${run.id.slice(0,8)}.zip`);

  }catch(e){setError(String(e));}}

  const visiblePapers=JOURNAL_PAPERS.filter(p=>journal==='all'||p.journal===journal);

  const tableName=run?(table in run.result.tables?table:Object.keys(run.result.tables)[0]):'';

  const rows=run?.result.tables[tableName]||[],headers=rows.length?Object.keys(rows[0]):[];

  return <div className="open-workbench">

    <div className="open-intro"><span className="lab-eyebrow">Established open-source engines</span><h3>Run the research method, keep the evidence.</h3><p>Twelve executable R workflows connected to your dataset. Each includes a journal-method rationale, a working analysis, diagnostics and an exportable reproduction bundle.</p><p className="lab-note">R and packages download on demand; your dataset is passed to a worker on this device. No paid statistical licence or R server is required. First load can take several minutes. Desktop R remains the route for models outside the stated scope.</p></div>

    <div className="open-route-grid">{WORKFLOWS.map(w=><button key={w.id} className={`open-route ${spec.workflow===w.id?'selected':''}`} aria-pressed={spec.workflow===w.id} disabled={busy} onClick={()=>patch({workflow:w.id})}><span>{w.package}</span><strong>{w.name}</strong><small>{w.replaces}</small></button>)}</div>

    <section className="lab-card"><h3>{workflow.name}</h3><p>{workflow.purpose}</p><div className="open-columns"><div><h4>Data structure</h4><p>{workflow.data}</p><h4>What you receive</h4><ul>{workflow.outputs.map(x=><li key={x}>{x}</li>)}</ul></div><div><h4>Across your research projects</h4><ol>{workflow.steps.map(x=><li key={x}>{x}</li>)}</ol></div></div><p className="lab-alert">{workflow.limits}</p><details><summary>Journal-method evidence and package documentation</summary>{JOURNAL_PAPERS.filter(p=>workflow.sources.includes(p.doi)).map(p=><p key={p.doi}><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a><br/><small>{p.journal} · metadata year {p.year} · DOI {p.doi}</small></p>)}<a href={workflow.docs} target="_blank" rel="noreferrer">Official {workflow.package} documentation ↗</a><p className="lab-note">These sources motivate method coverage. The software routes are our implementation choices, not endorsements by the journals or reproductions of the cited papers’ results.</p></details></section>

    {!dataset?<p className="lab-alert">{embedded?'Load quantitative ingredients above, then configure this method.':'Load a dataset in the Data tab.'} No invented results or example research findings are preloaded.</p>:<section className="lab-card"><h3>Configure against your data</h3><p>{dataset.name} · {dataset.rows.length} rows{dataset.source==='demo'?' · SIMULATED demo data':''}</p>

      <fieldset disabled={busy}><legend>Model specification</legend>

      {['sem','invariance'].includes(spec.workflow)?<>

        <details open><summary>Variable aliases used by the R model</summary><div className="open-aliases">{dataset.variables.map((v,i)=><code key={v.name}>v{i+1} = {v.name}</code>)}</div></details>

        <label className="lab-field">Model syntax<textarea className="open-code" rows={7} value={spec.model} onChange={e=>patch({model:e.target.value})} placeholder={'FactorA =~ v1 + v2 + v3\nFactorB =~ v4 + v5 + v6\nFactorB ~ FactorA'}/></label>

        <p className="lab-note">Use =~ for measurement, ~ for regression, ~~ for covariance. Aliases prevent punctuation in column names from changing the model. The example is syntax guidance, not a validated theory.</p>

        {spec.workflow==='invariance'?choose('Grouping variable','group'):<><label className="lab-field">Estimator<select value={spec.estimator} onChange={e=>patch({estimator:e.target.value as OpenSpec['estimator']})}><option value="MLR">Robust maximum likelihood + FIML</option><option value="ML">Maximum likelihood + FIML</option><option value="WLSMV">Ordinal WLSMV + listwise deletion</option></select></label>{spec.estimator==='WLSMV'&&multi('Ordered indicators','ordered')}</>}

      </>:spec.workflow==='growth'?<>{multi('Waves — click in chronological order','waves')}<p>Selected order: {spec.waves.join(' → ')||'None'}</p><label className="lab-field">Relative observation times (comma-separated)<input value={spec.times.join(', ')} onChange={e=>patch({times:e.target.value.split(',').map(x=>Number(x.trim()))})}/></label><p className="lab-note">Selecting another wave resets times to 0,1,2…; replace with the actual intervals before running.</p></>:<>

        <div className="lab-fields">{choose(spec.workflow==='meta'?'Effect estimate yi':spec.workflow==='survival'?'Event indicator (0 censored, 1 event)':'Outcome','outcome',numeric)}

        {spec.workflow==='mediation'&&<>{choose('X predictor','x',numeric)}{choose('Mediator','mediator',numeric)}</>}

        {spec.workflow==='meta'&&choose('Sampling variance vi (not SE)','variance',numeric)}

        {['mixed','panel'].includes(spec.workflow)&&choose('Group / unit ID','group')}

        {spec.workflow==='panel'&&choose('Time period','time')}{spec.workflow==='survival'&&choose('Follow-up time','time',numeric)}{spec.workflow==='gam'&&choose('Smooth predictor','x',numeric)}{spec.workflow==='equivalence'&&choose('Two independent groups','group')}

        </div>

        {!['mediation','equivalence'].includes(spec.workflow)&&multi(spec.workflow==='meta'?'Numeric moderators (optional)':'Numeric predictors','predictors',numeric.filter(x=>x!==spec.outcome&&x!==spec.variance))}

        {spec.workflow==='mixed'&&<><div className="lab-fields">{choose('Random-slope predictor (optional)','slope',spec.predictors,true)}<label className="lab-field">Outcome family<select value={spec.family} onChange={e=>patch({family:e.target.value as OpenSpec['family']})}><option value="gaussian">Gaussian continuous outcome</option><option value="binomial">Bernoulli 0/1 · logit</option><option value="poisson">Poisson counts · log</option></select></label></div><label><input type="checkbox" checked={spec.within} onChange={e=>patch({within:e.target.checked})}/> Decompose the slope predictor into within-group and group-mean components</label></>}

        {spec.workflow==='impute'&&multi('Continuous auxiliary variables (optional)','auxiliary',numeric.filter(v=>v!==spec.outcome&&!spec.predictors.includes(v)))}

      </>}

      {spec.workflow==='gam'&&<label className="lab-field">Smooth basis size<input type="number" min="4" max="30" value={spec.basis} onChange={e=>patch({basis:Number(e.target.value)})}/></label>}

      {spec.workflow==='quantile'&&<label className="lab-field">Conditional quantile (tau)<input type="number" min=".05" max=".95" step=".05" value={spec.tau} onChange={e=>patch({tau:Number(e.target.value)})}/></label>}

      {spec.workflow==='equivalence'&&<div className="lab-fields"><label className="lab-field">Prespecified lower bound<input type="number" step="any" value={spec.lower} onChange={e=>patch({lower:Number(e.target.value)})}/></label><label className="lab-field">Prespecified upper bound<input type="number" step="any" value={spec.upper} onChange={e=>patch({upper:Number(e.target.value)})}/></label><p className="lab-note">Default bounds are placeholders, not validated choices. Specify meaningful limits in outcome units before inspecting results.</p></div>}

      <div className="lab-fields"><label className="lab-field">Reproducible random seed<input type="number" value={spec.seed} onChange={e=>patch({seed:Number(e.target.value)})}/></label>{['mediation','quantile'].includes(spec.workflow)&&<label className="lab-field">Bootstrap replicates (100–10,000)<input type="number" min="100" max="10000" value={spec.bootstrap} onChange={e=>patch({bootstrap:Number(e.target.value)})}/><small>100 is for a smoke check; choose a defensible larger count for research.</small></label>}{spec.workflow==='impute'&&<><label className="lab-field">Imputed datasets<input type="number" min="2" max="100" value={spec.imputations} onChange={e=>patch({imputations:Number(e.target.value)})}/></label><label className="lab-field">Iterations per chain<input type="number" min="2" max="100" value={spec.iterations} onChange={e=>patch({iterations:Number(e.target.value)})}/></label></>}</div></fieldset>

      <div className="lab-actions"><button className="btn primary" disabled={busy||!hash} onClick={execute}>{busy?'Running R…':`Run with ${workflow.package}`}</button>{busy&&<button className="btn" onClick={()=>{attempt.current++;resetOpenEngine();setBusy(false);setStatus('R worker stopped; unfinished run discarded.');}}>Stop & reset R worker</button>}<button className="btn" disabled={busy} onClick={()=>{try{const p=prepareOpen(dataset,spec);download({spec:JSON.parse(p.specJSON),mapping:p.mapping},'analysis-plan.json');}catch(e){setError(String(e));}}}>Export configured analysis plan</button></div>

      <p role="status" aria-live="polite">{status}</p>

    </section>}

    {error&&<p className="lab-alert" role="alert">{error}</p>}{saveError&&<p className="lab-alert" role="alert">{saveError}</p>}

    {runs.length>0&&<section className="lab-card"><label className="lab-field">Actual R run history · {runs.length} retained<select value={run?.id||''} onChange={e=>{setActive(e.target.value);setTable('');}}>{[...runs].reverse().map(r=><option key={r.id} value={r.id}>{new Date(r.at).toLocaleString()} · {r.spec.workflow} · {r.datasetName}</option>)}</select></label>

      {run&&<><h3 style={{marginTop:24}}>{WORKFLOWS.find(w=>w.id===run.spec.workflow)?.name}</h3>{run.hash!==hash&&<p className="lab-alert">This historical result uses a different dataset version. Reload the original data to include it in a reproduction bundle.</p>}<div className="lab-metrics">{Object.entries(run.result.metrics).map(([k,v])=><div key={k}><strong>{print(v)}</strong>{k}</div>)}</div>

      {run.result.warnings.length>0&&<div className="lab-alert"><strong>R engine warnings — review required</strong><ul>{run.result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}

      <ResultChart run={run}/><MethodVisuals run={run}/><label className="lab-field">Result table<select value={tableName} onChange={e=>setTable(e.target.value)}>{Object.keys(run.result.tables).map(k=><option key={k}>{k}</option>)}</select></label><div className="lab-table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(0,300).map((row,i)=><tr key={i}>{headers.map(h=><td key={h}>{print(row[h])}</td>)}</tr>)}</tbody></table></div>{rows.length>300&&<p className="lab-note">Showing 300 of {rows.length} rows; the bundle includes all rows.</p>}

      <details><summary>Provenance, aliases, exclusions and software versions</summary><p>SHA-256 <code className="lab-hash">{run.hash}</code></p><div className="open-aliases">{run.mapping.map(v=><code key={v.alias}>{v.alias} = {v.name}</code>)}</div><pre>{JSON.stringify(run.result.versions,null,2)}</pre><p>Excluded original data rows: {run.result.excluded.join(', ')||'None'}</p>{run.result.messages.map((m,i)=><p key={i}>{m}</p>)}<pre>{run.result.citations.join('\n')}</pre></details>

      <label><input type="checkbox" checked={includeData} disabled={hash!==run.hash} onChange={e=>setIncludeData(e.target.checked)}/> Include matching participant/study data in the downloaded ZIP</label><div className="lab-actions"><button className="btn primary" onClick={exportBundle}>Download reproducibility ZIP</button><button className="btn" onClick={()=>download(run,`open-run-${run.id.slice(0,8)}.json`)}>{embedded?'Download run JSON':'Export run to Studio'}</button><button className="btn" onClick={()=>download(run.report,'methods-results.md')}>Methods & Results record</button></div><p className="lab-note">{embedded?'Completed runs are captured directly in this study for Write.':'In Studio → Analyze, import the exported run JSON to carry its results into your study.'} Archives contain real output and package citations. Model warnings remain attached.</p></>}

    </section>}

    <section className="lab-card"><h3>Journal → method → open-source route</h3><p>This is a hand-reviewed methods sample, not a census or journal ranking. Metadata verification confirms bibliographic identity; the workflow mapping is our synthesis. Online-first and issue years can differ.</p><label className="lab-field">Journal evidence filter<select value={journal} onChange={e=>setJournal(e.target.value)}><option value="all">All reviewed journals</option>{[...new Set(JOURNAL_PAPERS.map(p=>p.journal))].map(j=><option key={j}>{j}</option>)}</select></label><div className="open-evidence">{visiblePapers.map(p=><article key={p.doi}><small>{p.journal} · metadata year {p.year}</small><h4><a href={p.url} target="_blank" rel="noreferrer">{p.title}</a></h4><p>{WORKFLOWS.filter(w=>w.sources.includes(p.doi)).map(w=><button key={w.id} className="btn small" onClick={()=>patch({workflow:w.id})}>{w.name}</button>)}</p><a href={p.metadataSource} target="_blank" rel="noreferrer">OpenAlex record ↗</a><small> · checked {p.metadataCheckedAt.slice(0,10)}</small></article>)}</div><h4>Reporting expectations</h4>{JOURNAL_POLICIES.map(p=><p key={p.journal}><a href={p.url} target="_blank" rel="noreferrer">{p.journal}</a> — {p.finding} <small>Checked {p.checked}.</small></p>)}</section>

    <section className="lab-card"><h3>Open-source companions and explicit boundaries</h3><p>These are external alternatives, not engines embedded in this page.</p>{COMPANION_TOOLS.map(t=><div className="open-companion" key={t.name}><a href={t.url} target="_blank" rel="noreferrer"><strong>{t.name} ↗</strong></a><p>{t.use}</p><p className="lab-note">{t.suite}</p></div>)}<p className="lab-note">Data/code exports are the interoperability route; selecting a companion does not transmit your dataset.</p></section>

  </div>;

}
