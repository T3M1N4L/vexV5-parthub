import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {preserveDarkDetails} from './refine-cutouts.mjs';
import { removeBackground } from '@imgly/background-removal-node';

const catalogPath='public/data/catalog.json';
const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
const originals=new Map((await fs.readdir('public/images',{withFileTypes:true})).filter(e=>e.isFile()).map(e=>[path.parse(e.name).name,'/images/'+e.name]));
const references=[...new Set(catalog.products.flatMap(p=>[...p.images,...p.variants.map(v=>v.image).filter(Boolean)]))];
const replacements=new Map();
let completed=0,created=0;
await fs.mkdir('public/images/cutouts-v2',{recursive:true});
for(const reference of references){
 const stem=path.parse(reference).name;
 const originalStem=reference.includes('/cutouts-v2/')?stem.replace(/-[a-f0-9]{12}$/,''):stem;
 const source=originals.get(originalStem)||reference;
 let input=sharp('public'+source);
 const {data:edge,info:m}=await input.clone().ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let border=0,white=0;
 for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if(x===0||y===0||x===m.width-1||y===m.height-1){border++;const i=(y*m.width+x)*4;if(edge[i]>235&&edge[i+1]>235&&edge[i+2]>235&&edge[i+3]>245)white++;}
 // Preserve images which already have transparency or a non-white backdrop.
 if(white/border<.8){replacements.set(reference,source);continue;}
 const bytes=await fs.readFile('public'+source);
 const hash=crypto.createHash('sha256').update(bytes).update(originalStem.startsWith('robo-')?'technical-edge-crop-v2':'imgly-medium-crop-v2').digest('hex').slice(0,12);
 const output='/images/cutouts-v2/'+originalStem+'-'+hash+'.png';
 try{await fs.access('public'+output);replacements.set(reference,output);continue;}catch{}
 // Robosource embeds black size labels in the white header. The same details
 // are rendered as accessible text in each card; crop only isolated header bands.
 if(path.basename(source).startsWith('robo-')){
  const {data:rgb,info:m}=await input.clone().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const bands=[];let start=null;
  for(let y=0;y<m.height;y++){let ink=false;for(let x=0;x<m.width;x++){const i=(y*m.width+x)*3;if(Math.min(rgb[i],rgb[i+1],rgb[i+2])<200){ink=true;break;}}if(ink&&start===null)start=y;if(!ink&&start!==null){bands.push([start,y-1]);start=null;}}
  const header=bands.filter(([a,b])=>a<m.height*.20&&b<m.height*.23);
  if(header.length){const top=header.at(-1)[1]+5;input=input.extract({left:0,top,width:m.width,height:m.height-top});}
 }
 const png=await input.png().toBuffer();
 let result;
 if(originalStem.startsWith('robo-')){
  // Multi-view technical renders contain small profile views which a semantic
  // model can mistake for shadows. Preserve these with an edge-connected matte.
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,n=w*h,mask=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
  const white=i=>data[i*4]>=245&&data[i*4+1]>=245&&data[i*4+2]>=245&&data[i*4+3]>245;
  const add=i=>{if(!mask[i]&&white(i)){mask[i]=1;queue[tail++]=i;}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(head<tail){const i=queue[head++],x=i%w;if(x>0)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<n-w)add(i+w);}
  for(let i=0;i<n;i++)if(mask[i])data[i*4+3]=0;
  result=await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
 }else{
  const blob=await removeBackground(new Blob([png],{type:'image/png'}),{model:'medium'});
  result=Buffer.from(await blob.arrayBuffer());
 }
 if((await sharp(result).stats()).channels[3].max===0)throw Error('Empty cutout: '+source);
 await fs.writeFile('public'+output,result);
 replacements.set(reference,output);created++;
 if(++completed%8===0)console.log(`Segmented ${completed} images…`);
}
await preserveDarkDetails(replacements,originals);
for(const p of catalog.products){p.images=p.images.map(i=>replacements.get(i)||i);for(const v of p.variants)v.image=replacements.get(v.image)||v.image;}
await fs.writeFile(catalogPath+'.tmp',JSON.stringify(catalog,null,2));
await fs.rename(catalogPath+'.tmp',catalogPath);
console.log(`Created ${created} semantic cutouts; catalog updated atomically after processing. Original images retained.`);
