import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Segmentation may soften very small dark fasteners in product-kit photos.
// Preserve those dark details; the removed white/gray backdrop stays transparent.
export async function preserveDarkDetails(replacements,originals){
 for(const [reference,output] of replacements){
  if(!output.includes('/cutouts-v2/')||path.basename(output).startsWith('robo-'))continue;
  const stem=path.parse(output).name.replace(/-[a-f0-9]{12}$/,'');
  const source=originals.get(stem);
  if(!source)continue;
  const [{data:rgb,info:a},{data:rgba,info:b}]=await Promise.all([sharp('public'+source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),sharp('public'+output).ensureAlpha().raw().toBuffer({resolveWithObject:true})]);
  if(a.width!==b.width||a.height!==b.height)throw Error('Cutout dimension mismatch: '+output);
  for(let i=0;i<rgba.length;i+=4){const darkness=Math.max(rgb[i],rgb[i+1],rgb[i+2]);const minimum=Math.max(0,Math.min(255,(140-darkness)*12.75));if(rgb[i+3]>245&&rgba[i+3]<minimum){rgba[i]=rgb[i];rgba[i+1]=rgb[i+1];rgba[i+2]=rgb[i+2];rgba[i+3]=minimum;}}
  await sharp(rgba,{raw:{width:b.width,height:b.height,channels:4}}).png().toFile('public'+output+'.tmp');await fs.rename('public'+output+'.tmp','public'+output);
 }
}
