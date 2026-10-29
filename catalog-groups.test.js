import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {groupCatalog} from './catalog-groups';
const products=JSON.parse(readFileSync(new URL('./public/data/catalog.json',import.meta.url))).products;
test('families preserve every variant and supplier identity, price, image and original purchase link',()=>{
 const grouped=groupCatalog(products);
 const before=products.flatMap(p=>p.variants.map(v=>({...v,url:v.url||p.url})));
 const after=grouped.flatMap(p=>p.variants.map(v=>({...v,url:v.url||p.url})));
 expect(after.length).toBe(before.length);
 expect(new Set(after.map(v=>v.id)).size).toBe(after.length);
 for(const v of before)expect(after.find(x=>x.id===v.id)).toMatchObject({sku:v.sku,price:v.price,image:v.image,url:v.url,available:v.available});
 expect(grouped.filter(p=>p.title==='6P Sprockets')[0].variants).toHaveLength(5);
 expect(grouped.filter(p=>p.title==='9P Sprockets')[0].variants).toHaveLength(5);
 expect(grouped.filter(p=>p.title==='Gears')[0].variants).toHaveLength(8);
 expect(grouped.filter(p=>p.title==='Star Drive Screws'&&p.supplier==='Robosource')[0].variants.some(v=>/variety pack/i.test(v.title))).toBe(true);
});
