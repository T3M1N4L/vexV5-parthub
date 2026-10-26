import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
// Remove only near-white background connected to image edges. Keep product whites
// and pre-existing transparency; retain source files for reproducible processing.
const catalogPath='public/data/catalog.json';
const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
const sources=[...new Set(catalog.products.flatMap(p=>[...p.images,...p.variants.map(v=>v.image).filter(Boolean)]))];
const replacements=new Map();
for(const source of sources){
 if(source.includes('/transparent/'))continue;
 let input=sharp('public'+source);
 // Robosource embeds black size labels in the white header. The same details
 // are rendered as accessible text in each card; crop only isolated header bands.
 if(path.basename(source).startsWith('robo-')){
  const {data:rgb,info:m}=await input.clone().removeAlpha().raw().toBuffer({resolveWithObject:true});
  const bands=[];let start=null;
  for(let y=0;y<m.height;y++){let ink=false;for(let x=0;x<m.width;x++){const i=(y*m.width+x)*3;if(Math.min(rgb[i],rgb[i+1],rgb[i+2])<200){ink=true;break;}}if(ink&&start===null)start=y;if(!ink&&start!==null){bands.push([start,y-1]);start=null;}}
  const header=bands.filter(([a,b])=>a<m.height*.20&&b<m.height*.23);
  if(header.length){const top=header.at(-1)[1]+5;input=input.extract({left:0,top,width:m.width,height:m.height-top});}
 }
 const {data,info}=await input.ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;const n=w*h;
 const white=i=>data[i*4]>=245&&data[i*4+1]>=245&&data[i*4+2]>=245&&data[i*4+3]>245;
 let border=0,whites=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(x===0||y===0||x===w-1||y===h-1){border++;if(white(y*w+x))whites++;}
 if(whites/border<.8)continue;
 const mask=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 function add(i){if(!mask[i]&&white(i)){mask[i]=1;queue[tail++]=i;}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const i=queue[head++],x=i%w;if(x>0)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<n-w)add(i+w);}
 for(let i=0;i<n;i++)if(mask[i])data[i*4+3]=0;
 const output='/images/transparent/'+path.parse(source).name+'.png';
 await fs.mkdir('public/images/transparent',{recursive:true});
 await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toFile('public'+output);
 replacements.set(source,output);
}
for(const p of catalog.products){p.images=p.images.map(i=>replacements.get(i)||i);for(const v of p.variants)v.image=replacements.get(v.image)||v.image;}
await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2));
console.log(`Created ${replacements.size} transparent PNGs; original product images retained.`);
