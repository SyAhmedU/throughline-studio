import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve(import.meta.dirname,'../src/vendor/toolsscope');const m=JSON.parse(readFileSync(resolve(dir,'SOURCE.json'),'utf8'));
for(const [path,expected] of Object.entries(m.files)){const body=readFileSync(resolve(dir,path),'utf8').replace(/\r\n/g,'\n');assert.equal(createHash('sha256').update(body).digest('hex'),expected,`Canonical snapshot changed: ${path}; edit ToolsScope and re-sync.`)}
console.log('PASS canonical engine snapshot:',Object.keys(m.files).length,'normalized source hashes.');
