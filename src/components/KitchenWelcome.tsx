import {useState} from 'react';
import {RECIPES,kitchenState} from '../lib/kitchen';
import type {Project,StageId} from '../lib/types';
import {createProject,setStageData} from '../lib/store';
import {navigate} from '../lib/router';
import {nextAction,flowTitle} from '../lib/studyFlow';
import './ResearchKitchen.css';
import {KitchenStory,RecipeStory} from './KitchenStory';
export function nextKitchenAction(p:Project):{stage:StageId;label:string}{
 const stage=nextAction(p)||'publish';
 return {stage,label:`Continue to ${flowTitle(p,stage)}`};
}
export default function KitchenWelcome({projects}:{projects:Project[]}){
 const [family,setFamily]=useState('Mixed methods'),[recipe,setRecipe]=useState('convergent'),[title,setTitle]=useState(''),[projectId,setProjectId]=useState('');
 const selected=RECIPES.find(r=>r.id===recipe)!;
 function begin(){let p=projects.find(p=>p.id===projectId)||createProject(title,'');p=setStageData(p,'analyze',{...p.stages.analyze.data,kitchen:{...kitchenState(p.stages.analyze.data.kitchen),recipeId:recipe,completedSteps:[]}});navigate(`/p/${p.id}/analyze`);}
 return <section className="research-kitchen kitchen-welcome" aria-label="Research kitchen"><div className="k-welcome-copy"><p className="k-eyebrow">Your research kitchen</p><h2 className="k-welcome-title">What are we<br/><em>cooking up today?</em></h2><p>A good paper begins like a good meal: know what you want to make, choose ingredients you can trust, and keep a record of how you prepared them. Bring your question; we will help you organise the kitchen.</p><div className="k-path" aria-label="Research workflow">{['Question','Ingredients','Utensils','Method','Evidence'].map((x,i)=><span key={x}><b>{i+1}</b>{x}</span>)}</div><KitchenStory/><div className="k-today"><h3>Ready on your bench</h3>{projects.length?projects.slice(0,3).map(p=>{const next=nextKitchenAction(p);return <button key={p.id} onClick={()=>navigate(`/p/${p.id}/${next.stage}`)}><span>{p.title}</span><strong>{next.label} →</strong></button>}):<p>Your first recipe starts a real project. No sample findings are added.</p>}</div></div><div className="k-menu"><p className="k-eyebrow">Choose the dish · {RECIPES.length} research recipes</p><div className="k-tabs">{['Mixed methods','Quantitative','Qualitative','Evidence synthesis'].map(f=><button key={f} aria-pressed={family===f} onClick={()=>{setFamily(f);setRecipe(RECIPES.find(r=>r.family===f)!.id)}}>{f}</button>)}</div><label>Research recipe<select value={recipe} onChange={e=>setRecipe(e.target.value)}>{RECIPES.filter(r=>r.family===family).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><RecipeStory recipe={selected}/><label>Use a project<select value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Start a new study</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{!projectId&&<label>Working question or title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="What do you want to understand?"/></label>}<button className="k-primary" disabled={!projectId&&!title.trim()} onClick={begin}>Prepare this study →</button><small>Choosing a recipe does not establish design validity. You remain the researcher.</small></div></section>;
}
