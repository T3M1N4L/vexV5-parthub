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

test('groups the remaining size/color families while keeping distinct types and suppliers separate',()=>{
 const grouped=groupCatalog(products);
 const expected={'V5 Smart Motor (11W) & Cartridges':4,'V5 Smart Cables & Accessories':4,'Omni-Directional Wheels':4,'Traction Wheels':5,'Aluminum C-Channels':5,'Gussets':8,'High Strength Shafts':4,'High Strength Shaft Adapters':2,'Capped Drive Shafts':2,'Drive Shafts':3};
 for(const [title,count] of Object.entries(expected))expect(grouped.find(p=>p.title===title)?.variants.length,title).toBe(count);
 expect(grouped.some(p=>p.title==='Compression Wheels')).toBe(false);
 expect(grouped.filter(p=>p.supplier==='VEX Robotics'&&/Compression Wheel/i.test(p.title))).toHaveLength(7);
 const standoffs=grouped.find(p=>p.title==='Aluminum Hex Standoffs');expect(new Set(standoffs.variants.map(v=>v.options[0])).size).toBe(7);
 const spacers=grouped.find(p=>p.title==='Nylon Washers & Spacers');
 expect(spacers.variants.length).toBe(49);
 expect(standoffs.category).toBe('Standoffs');expect(spacers.category).toBe('Spacers');
 expect(standoffs.variants.every(v=>products.find(p=>p.variants.some(x=>x.id===v.id)).category==='Standoffs')).toBe(true);
 expect(spacers.variants.every(v=>products.find(p=>p.variants.some(x=>x.id===v.id)).category==='Spacers')).toBe(true);
 for(const group of grouped){const suppliers=new Set(group.variants.map(v=>products.find(p=>p.variants.some(x=>x.id===v.id)).supplier||'Whimsy Tech'));expect(suppliers.size).toBe(1);}
 expect(grouped.some(p=>p.title==='Smart Motor (5.5W)')).toBe(true);
 expect(grouped.some(p=>p.title==='Black Nylon Hex Standoffs')).toBe(true);
 expect(grouped.some(p=>p.title==='Black High Strength Acetal Spacers')).toBe(true);
});

test('motor family starts with the 11W motor and its photo',()=>{
 const family=groupCatalog(products).find(p=>p.title==='V5 Smart Motor (11W) & Cartridges');
 expect(family.variants[0].sku).toBe('276-4840');
 expect(family.images[0]).toBe(family.variants[0].image);
});
