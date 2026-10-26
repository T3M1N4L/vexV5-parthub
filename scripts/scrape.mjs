import fs from 'node:fs/promises';
const base='https://www.whimsytech.net';
const patterns=[/t15.*flat.*head/i,/nylock.*001/i,/nylock.*002/i,/alumin.*standoff/i,/spacer/i,/black.*nylon.*standoff/i,/quick.*connect.*(?:t.?fitting|switch)/i];
const products=[]; let page=1;
while(true){
 const r=await fetch(`${base}/collections/v5rc-compatible/products.json?limit=250&page=${page}`);
 if(!r.ok) throw Error(`Catalog access failed: HTTP ${r.status}; existing catalog preserved`);
 const data=await r.json(); if(!Array.isArray(data.products)) throw Error('Invalid catalog response');
 if(!data.products.length) break;
 for(const p of data.products){if(!patterns.some(x=>x.test(p.title)))continue;
  products.push({id:String(p.id),title:p.title,url:`${base}/products/${p.handle}`,category:/standoff/i.test(p.title)?'Standoffs':/spacer|washer/i.test(p.title)?'Spacers':/nylock/i.test(p.title)?'Nuts':/quick|pneumatic/i.test(p.title)?'Pneumatics':'Screws',images:p.images.map(i=>i.src),options:p.options,variants:p.variants.map(v=>({id:String(v.id),title:v.title,sku:v.sku||null,price:Number(v.price),available:v.available,options:[v.option1,v.option2,v.option3].filter(Boolean),image:p.images.find(i=>i.variant_ids?.includes(v.id))?.src||p.images[0]?.src||null}))});
 }
 if(data.products.length<250)break;
 if(++page>100)throw Error('Pagination limit; catalog not saved');
}
if(!products.length)throw Error('No matching products; catalog not saved');
const old=JSON.parse(await fs.readFile('public/data/catalog.json','utf8'));
await fs.mkdir('public/images',{recursive:true});
for(const p of products){const urls=[...new Set([...p.images,...p.variants.map(v=>v.image).filter(Boolean)])];const map=new Map();for(let i=0;i<urls.length;i++){const url=urls[i];const r=await fetch(url);if(!r.ok)throw Error(`Image download failed ${r.status}`);const ext=new URL(url).pathname.split('.').pop().replace(/[^a-zA-Z0-9]/g,'')||'jpg';const path=`/images/${p.id}-${i}.${ext}`;await fs.writeFile(`public${path}`,Buffer.from(await r.arrayBuffer()));map.set(url,path);}p.images=p.images.map(u=>map.get(u));p.variants.forEach(v=>v.image=map.get(v.image)||null);}
await fs.writeFile('public/data/catalog.json',JSON.stringify({updatedAt:new Date().toISOString(),source:base,requested:old.requested,robosourceUpdatedAt:old.robosourceUpdatedAt,robosourceCoverage:old.robosourceCoverage,products:[...products,...old.products.filter(p=>p.supplier==='Robosource')]},null,2));
console.log(`Saved ${products.length} products, ${products.reduce((s,p)=>s+p.variants.length,0)} variants. Missing SKUs: ${products.flatMap(p=>p.variants).filter(v=>!v.sku).length}. Review coverage against requested families.`);
