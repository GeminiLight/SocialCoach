/** Khronos validator is production tooling, never part of the client bundle. */
import { createRequire } from 'node:module';
import { readFile,readdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const validator=require(process.env.GLTF_VALIDATOR_PATH??'gltf-validator');
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/3d/v2');
const reports=[];
for(const file of (await readdir(directory)).filter(f=>f.endsWith('.glb')).sort()) {
  const report=await validator.validateBytes(new Uint8Array(await readFile(path.join(directory,file))),{uri:file,writeTimestamp:false,maxIssues:0});
  reports.push({file,...report});
  console.log(`${file}: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
}
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify({validator:validator.version(),reports},null,2)+'\n');
process.exitCode=reports.some(r=>r.issues.numErrors||r.issues.numWarnings)?1:0;
