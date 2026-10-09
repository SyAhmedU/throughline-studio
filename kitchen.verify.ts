import assert from 'node:assert/strict';
import {exactPassage,emptyKitchen,validPassages,matrix,kitchenReport,RECIPES} from './src/lib/kitchen.ts';
const doc={id:'d1',caseId:'SIMULATED A',label:'SIMULATED test transcript',source:'QA fixture, not research evidence',text:'First statement.\nContradictory statement.',at:0};
const k=emptyKitchen();k.documents=[doc];k.codes=[{id:'c1',label:'QA code',definition:'QA only',theme:'QA theme',dimension:'QA dimension'}];
k.passages=[exactPassage(doc,'c1',17,41,true)];assert.equal(k.passages[0].quote,'Contradictory statement.');assert.equal(validPassages(k).length,1);assert.equal(matrix(k)[0].counts[0],1);
const altered=structuredClone(k);altered.documents[0].text='altered source';assert.equal(validPassages(altered).length,0);assert.equal(matrix(altered)[0].counts[0],0);
assert.throws(()=>exactPassage(doc,'c1',-1,4));assert.throws(()=>exactPassage(doc,'c1',2,1000));
k.joints=[{id:'j',construct:'QA integration',captureId:'r1',passageIds:[k.passages[0].id],alignment:'Same simulated case',fit:'Divergent',inference:'QA interpretation only',at:0}];const report=kitchenReport(k,[{id:'r1',title:'Actual QA engine result',apa:'Recorded result 0.25; warning retained.'}]);assert.match(report,/Contradictory statement/);assert.match(report,/warning retained/);assert.match(report,/Divergent/);
assert.doesNotMatch(kitchenReport(altered,[]),/Contradictory statement/);assert.match(kitchenReport(k,[]),/MISSING/);
assert.equal(RECIPES.length,20);assert.equal(new Set(RECIPES.map(r=>r.id)).size,20);assert.equal(RECIPES.filter(r=>r.workflow).length,12);
console.log('PASS exact quotations, tamper rejection, matrix counts, linked joint-display provenance, missing evidence, 20 distinct recipes.');

import {auditSecondary,emptySecondary,secondaryReport} from './src/lib/secondary.ts';
const fixture={name:'SIMULATED audit',simulated:true,variables:[{name:'id',type:'numeric' as const},{name:'value',type:'numeric' as const}],rows:[[1,0],[1,null],[null,-99],[2,'refused']]};
const audit=auditSecondary(fixture,'id');assert.equal(audit.duplicateKeys,1);assert.equal(audit.missingKeys,1);assert.equal(audit.columns[1].missing,1);assert.equal(audit.columns[1].nonnumeric,1);assert.equal(auditSecondary(fixture,'absent').keyChecked,false);assert.match(secondaryReport(emptySecondary(),fixture),/SIMULATED/);assert.match(secondaryReport(emptySecondary(),null),/No dataset loaded/);console.log('PASS secondary-data missingness, zero/sentinel preservation, key duplicates and absent data.');
