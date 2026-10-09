import {useState} from 'react';
import {RECIPES,kitchenState} from '../lib/kitchen';
import type {Project,StageId} from '../lib/types';
import {createProject,setStageData} from '../lib/store';
import {navigate} from '../lib/router';
import {readingList} from '../lib/corpus';
import './ResearchKitchen.css';
export function nextKitchenAction(p:Project):{stage:StageId;label:string}{
 const a=p.stages.analyze.data,k=kitchenState(a.kitchen);
 if(!p.question.trim())return {stage:'frame',label:'Sharpen the question'};
 if(!readingList(p).length)return {stage:'discover',label:'Find the first evidence'};
 if(!k.recipeId)return {stage:'analyze',label:'Choose a research recipe'};
 if(!a.dataset&&!k.documents.length)return {stage:'analyze',label:'Prepare the data ingredients'};
 if(!Array.isArray(a.captures)||!a.captures.length)return {stage:'analyze',label:'Cook the first analysis'};
 return {stage:'write',label:'Turn evidence into a draft'};
}
export default function KitchenWelcome({projects}:{projects:Project[]}){
 const [family,setFamily]=useState('Mixed methods'),[recipe,setRecipe]=useState('convergent'),[title,setTitle]=useState(''),[projectId,setProjectId]=useState('');
 const selected=RECIPES.find(r=>r.id===recipe)!;
 function begin(){let p=projects.find(p=>p.id===projectId)||createProject(title,'');p=setStageData(p,'analyze',{...p.stages.analyze.data,kitchen:{...kitchenState(p.stages.analyze.data.kitchen),recipeId:recipe,completedSteps:[]}});navigate(`/p/${p.id}/analyze`);}
 return <section className="research-kitchen kitchen-welcome" aria-label="Research kitchen"><div className="k-welcome-copy"><p className="k-eyebrow">Your research kitchen</p><h1>What are we<br/><em>discovering today?</em></h1><p>Choose a question. Gather the ingredients. Pick a method. Work with the evidence, all in your study.</p><div className="k-path" aria-label="Research workflow">{['Question','Ingredients','Utensils','Method','Evidence'].map((x,i)=><span key={x}><b>{i+1}</b>{x}</span>)}</div><div className="k-today"><h3>Ready on your bench</h3>{projects.length?projects.slice(0,3).map(p=>{const next=nextKitchenAction(p);return <button key={p.id} onClick={()=>navigate(`/p/${p.id}/${next.stage}`)}><span>{p.title}</span><strong>{next.label} →</strong></button>}):<p>Your first recipe starts a real project. No sample findings are added.</p>}</div></div><div className="k-menu"><p className="k-eyebrow">Choose the dish · {RECIPES.length} research recipes</p><div className="k-tabs">{['Mixed methods','Quantitative','Qualitative','Evidence synthesis'].map(f=><button key={f} aria-pressed={family===f} onClick={()=>{setFamily(f);setRecipe(RECIPES.find(r=>r.family===f)!.id)}}>{f}</button>)}</div><label>Research recipe<select value={recipe} onChange={e=>setRecipe(e.target.value)}>{RECIPES.filter(r=>r.family===family).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><h2>{selected.name}</h2><p>{selected.question}</p><div className="k-utensil"><span>UTENSILS</span><strong>{selected.utensil}</strong><small>Available inside Studio</small></div><label>Use a project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Start a new study</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{!projectId&&<label>Working question or title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What do you want to understand?"/></label>}<button className="k-primary" disabled={!projectId&&!title.trim()} onClick={begin}>Prepare this study →</button><small>Choosing a recipe does not establish design validity. You remain the researcher.</small></div></section>;
}
