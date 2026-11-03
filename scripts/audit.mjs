import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {platform,arch} from 'node:os';
const origin=new URL(process.argv[2]??'http://localhost:4173').origin;
const output=resolve('validation/lighthouse');
const categories=['performance','accessibility','best-practices','seo'];
const targets={performance:90,accessibility:95,'best-practices':95,seo:90};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
await mkdir(output,{recursive:true});
const browser=await chromeLauncher.launch({chromePath:process.env.CHROME_PATH||undefined,chromeFlags:['--headless=new','--no-sandbox','--disable-dev-shm-usage']});
try{
 const version=JSON.parse(await readFile(new URL('../node_modules/lighthouse/package.json',import.meta.url),'utf8')).version;
 const summary={measuredAt:new Date().toISOString(),origin,environment:{node:process.version,platform:platform(),arch:arch(),lighthouse:version,storageReset:true,mocks:'default; full images and functionality'},targets,pages:[]};
 for(const [name,path] of [['home','/'],['detail','/nft/nft-1']]){
  for(const profile of ['mobile','desktop']){
   const runs=[];
   for(let index=1;index<=3;index++){
    const result=await lighthouse(`${origin}${path}`,{port:browser.port,output:['html','json'],onlyCategories:categories,logLevel:'error',disableStorageReset:false},profile==='desktop'?desktopConfig:undefined);
    if(!result||result.lhr.runtimeError)throw new Error(result?.lhr.runtimeError?.message??'A auditoria não retornou um relatório.');
    const prefix=join(output,`${name}-${profile}-${index}`);
    await writeFile(`${prefix}.html`,Array.isArray(result.report)?result.report[0]:result.report);
    await writeFile(`${prefix}.json`,JSON.stringify(result.lhr,null,2));
    const scores=Object.fromEntries(categories.map(category=>{const score=result.lhr.categories[category]?.score;if(typeof score!=='number')throw new Error(`Categoria sem medição: ${category}`);return [category,Math.round(score*100)];}));
    const metrics=Object.fromEntries([['LCP','largest-contentful-paint'],['CLS','cumulative-layout-shift'],['TBT','total-blocking-time']].map(([label,key])=>{const value=result.lhr.audits[key]?.numericValue;if(typeof value!=='number')throw new Error(`Métrica sem medição: ${key}`);return [label,value];}));
    runs.push({run:index,scores,metrics,environment:result.lhr.environment});
    console.log(`${name} ${profile} ${index}/3: ${JSON.stringify(scores)}`);
   }
   const scores=Object.fromEntries(categories.map(key=>[key,median(runs.map(run=>run.scores[key]))]));
   const metrics=Object.fromEntries(['LCP','CLS','TBT'].map(key=>[key,median(runs.map(run=>run.metrics[key]))]));
   summary.pages.push({page:name,path,profile,runs,median:{scores,metrics},meetsTargets:categories.every(key=>scores[key]>=targets[key])});
  }
 }
 summary.meetsTargets=summary.pages.every(page=>page.meetsTargets);
 await writeFile(join(output,'summary.json'),JSON.stringify(summary,null,2));
 console.log(`Relatórios salvos em ${output}. Metas atendidas: ${summary.meetsTargets}.`);
 if(!summary.meetsTargets)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}finally{await browser.kill();}
