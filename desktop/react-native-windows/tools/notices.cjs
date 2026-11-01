// Retain available package license files for the independently bundled renderer.
const fs=require('node:fs'),path=require('node:path');
const lock=require('../package-lock.json');
const output=path.resolve(__dirname,'../out/win-x64/Notices/npm');fs.mkdirSync(output,{recursive:true});
const records=[];
for(const [relative,entry] of Object.entries(lock.packages)) {
 if(!relative||entry.dev)continue;
 const folder=path.resolve(__dirname,'..',relative);
 if(!fs.existsSync(folder)){if(entry.optional)continue;throw new Error(`Missing locked package: ${relative}`);}
 const name=relative.split('node_modules/').pop();
 const licenses=fs.readdirSync(folder).filter(f=>/^(license|licence|copying|notice)(\.|$)/i.test(f)&&fs.statSync(path.join(folder,f)).isFile());
 const destination=path.join(output,name.replaceAll('/','_'));fs.mkdirSync(destination,{recursive:true});
 for(const file of licenses)fs.copyFileSync(path.join(folder,file),path.join(destination,file));
 records.push({name,version:entry.version,license:entry.license??null,integrity:entry.integrity,files:licenses});
}
fs.writeFileSync(path.join(output,'inventory.json'),JSON.stringify(records,null,2)+'\n');
