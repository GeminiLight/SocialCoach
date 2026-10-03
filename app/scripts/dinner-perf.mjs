import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../src/features/dinner/components/DinnerScene.tsx',import.meta.url);
const importLine="import {DinnerProbe} from '../../../../tests/perf/DinnerProbe'; // local-perf-probe\n";
const probe='<DinnerProbe paused={props.paused} view={props.view}/> {/* local-perf-probe */}\n    ';
let source=await readFile(file,'utf8');
source=source.replace(importLine,'').replace(probe,'');
if(process.argv[2]==='enable')source=source.replace("import { Component",importLine+"import { Component").replace('<WorldDirector props=',probe+'<WorldDirector props=');
else if(process.argv[2]!=='disable')throw new Error('Use enable or disable');
await writeFile(file,source);
