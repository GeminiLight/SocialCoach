import {mkdir,copyFile,writeFile,readFile,stat,cp,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const app=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(join(app,'package.json'));
const root=join(app,'public/local-reading'),tesseract=dirname(require.resolve('tesseract.js/package.json'));
const core=dirname(createRequire(join(tesseract,'package.json')).resolve('tesseract.js-core/package.json'));
const pdf=dirname(require.resolve('pdfjs-dist/package.json'));
await mkdir(join(root,'core'),{recursive:true});await mkdir(join(root,'lang'),{recursive:true});
const files=[
 [join(tesseract,'dist/worker.min.js'),'worker.min.js'],
 [join(pdf,'build/pdf.worker.min.mjs'),'pdf.worker.min.mjs'],
 ...['tesseract-core-lstm','tesseract-core-simd-lstm','tesseract-core-relaxedsimd-lstm'].flatMap(name=>[[join(core,`${name}.wasm.js`),`core/${name}.wasm.js`],[join(core,`${name}.wasm`),`core/${name}.wasm`]]),
 ...['chi_sim','eng'].map(lang=>[join(dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`)),'4.0.0_best_int',`${lang}.traineddata.gz`),`lang/${lang}.traineddata.gz`]),
];
for(const [source,name] of files)await copyFile(source,join(root,name));
await copyFile(join(pdf,'LICENSE'),join(root,'PDF-LICENSE'));
await copyFile(join(tesseract,'LICENSE.md'),join(root,'OCR-LICENSE'));
await copyFile(join(tesseract,'dist/worker.min.js.LICENSE.txt'),join(root,'OCR-WORKER-NOTICES.txt'));
await copyFile(join(core,'LICENSE'),join(root,'OCR-CORE-LICENSE'));
// The language packages declare Apache-2.0 but omit its text. Include the
// complete common license and identify the language source in NOTICE.
await copyFile(join(core,'LICENSE'),join(root,'LANGUAGE-LICENSE'));
await cp(join(pdf,'cmaps'),join(root,'cmaps'),{recursive:true});
await writeFile(join(root,'NOTICE.txt'),'Local reading assets, copied without modification\nPDF.js / Mozilla: Apache-2.0 — PDF-LICENSE; cmaps/LICENSE\nTesseract.js: Apache-2.0 — OCR-LICENSE; bundled third-party notices: OCR-WORKER-NOTICES.txt\nTesseract.js core: Apache-2.0 — OCR-CORE-LICENSE\nTesseract language data: Apache-2.0 — LANGUAGE-LICENSE; https://github.com/tesseract-ocr/tessdata_best\nVersions and hashes of every distributed asset, including character maps and notices: manifest.json. Loaded only when local document reading is requested.\n');
const manifest=[];
async function hashFiles(directory,prefix=''){
 for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const name=prefix+entry.name,source=join(directory,entry.name);
  if(entry.isDirectory())await hashFiles(source,`${name}/`);
  else if(name!=='manifest.json'){const bytes=await readFile(source);manifest.push({name,bytes:(await stat(source)).size,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }
}
await hashFiles(root);
await writeFile(join(root,'manifest.json'),JSON.stringify({pdf:require('pdfjs-dist/package.json').version,ocr:require('tesseract.js/package.json').version,files:manifest},null,2)+'\n');
console.log(`Prepared ${files.length} local reading assets (${Math.round(manifest.reduce((n,f)=>n+f.bytes,0)/1024/1024)} MB), loaded on demand.`);
