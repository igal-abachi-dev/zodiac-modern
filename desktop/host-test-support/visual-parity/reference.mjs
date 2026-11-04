// Measure the built reference's actual CSS boxes; this is visual QA, not timing.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(resolve(import.meta.dirname,'../../../package.json'))('@playwright/test');
const desktop=resolve(import.meta.dirname,'../..');
const root=resolve(desktop,'Tauri-v2-Svelte5/dist');
const output=resolve(desktop,'host-test-support/visual-parity/results/reference');
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+sep)||!types[extname(file)]){res.writeHead(403).end();return;}res.setHeader('Content-Type',types[extname(file)]);res.setHeader('Cache-Control','no-store');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:2});
 const url=`http://127.0.0.1:${server.address().port}`;
 await page.goto(url);await page.getByRole('status').filter({hasText:'Ready'}).waitFor();await page.evaluate(()=>document.fonts.ready);
 const geometry=async()=>page.evaluate(()=>{const selectors={shell:'.shell',header:'.topbar',brand:'.brand-icon',title:'h1',subtitle:'.subtitle',about:'.topbar .secondary',badge:'.badge',decryptCard:'.grid .card:first-child',encryptCard:'.grid .card:last-child',fixture:'.fixture',decrypt:'#decrypt',encrypt:'#encrypt',statusCard:'.status-card',status:'#status',reset:'#reset',progress:'.progress-track',caption:'.progress-caption',footer:'.footer',workbench:'#open-workbench'};return Object.fromEntries(Object.entries(selectors).map(([key,selector])=>{const e=document.querySelector(selector);if(!e)return[key,null];const r=e.getBoundingClientRect(),s=getComputedStyle(e);return[key,{x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor,radius:s.borderRadius,text:e.textContent.trim()}];}));});
 const results={engine:browser.version(),scale:2,wide:await geometry()};await page.screenshot({path:resolve(output,'main.png')});
 await page.getByRole('button',{name:'About this test',exact:true}).click();await page.screenshot({path:resolve(output,'about.png')});await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.setViewportSize({width:480,height:640});await page.evaluate(()=>window.scrollTo(0,0));results.narrow=await geometry();await page.screenshot({path:resolve(output,'narrow.png')});
 await page.setViewportSize({width:960,height:640});await page.getByRole('button',{name:'Open workbench',exact:true}).click();await page.getByText('Workbench ready',{exact:true}).waitFor();await page.screenshot({path:resolve(output,'workbench.png')});
 await writeFile(resolve(output,'geometry.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.wide,null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
