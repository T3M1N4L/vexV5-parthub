// Present supplier listings as families without changing variant identities.
function family(p) {
  const supplier = p.supplier || 'Whimsy Tech';
  if (supplier === 'Whimsy Tech') {
    if (/Aluminum Hex Standoffs/i.test(p.title)) return ['aluminum-standoffs', 'Aluminum Hex Standoffs'];
    if (/Nylon (?:Washers & Spacers|Spacers)$/i.test(p.title) && !/Pasta/i.test(p.title)) return ['nylon-spacers', 'Nylon Washers & Spacers'];
  }
  if (supplier === 'Robosource') {
    const color = /^Color Coded /i.test(p.title);
    const title = p.title.replace(/^Color Coded /i, '');
    if (/^Star Drive Screws/i.test(title)) return [color ? 'color-star' : 'star', `${color ? 'Color Coded ' : ''}Star Drive Screws`];
    if (/^Shoulder Screws/i.test(title)) return [color ? 'color-shoulder' : 'shoulder', `${color ? 'Color Coded ' : ''}Shoulder Screws`];
  }
  if (supplier === 'VEX Robotics') {
    if (/Smart Motor.*Cartridge|Smart Motor.*11W/i.test(p.title)) return ['11w-motor', 'V5 Smart Motor (11W) & Cartridges'];
    if (/^Smart Cable/i.test(p.title)) return ['smart-cables', 'V5 Smart Cables & Accessories'];
    if (/Omni-Directional.*Wheel/i.test(p.title)) return ['omni-wheels', 'Omni-Directional Wheels'];
    if (p.category === 'Wheels' && /Wheel/i.test(p.title) && !/Compression|Omni|Tread/i.test(p.title)) return ['traction-wheels', 'Traction Wheels'];
    if (/Aluminum C-Channel/i.test(p.title)) return ['c-channel', 'Aluminum C-Channels'];
    if (/Gusset/i.test(p.title)) return ['gussets', 'Gussets'];
    if (/High Strength Shaft Adapter/i.test(p.title)) return ['shaft-adapters', 'High Strength Shaft Adapters'];
    if (/^\d+" High Strength Shaft/i.test(p.title)) return ['hs-shafts', 'High Strength Shafts'];
    if (/Capped Shaft/i.test(p.title)) return ['capped-shafts', 'Capped Drive Shafts'];
    if (/Shaft Add-On|Drive Shaft \(4-pack\)/i.test(p.title)) return ['drive-shafts', 'Drive Shafts'];

    if (/sprocket/i.test(p.title) && /\b6P\b/i.test(p.title)) return ['6p', '6P Sprockets'];
    if (/sprocket/i.test(p.title) && /\b9P\b/i.test(p.title)) return ['9p', '9P Sprockets'];
    if (/\bgear\b|\bpinion\b/i.test(p.title)) return ['gears', 'Gears'];
  }
  return null;
}
export function groupCatalog(products) {
  const output = [], groups = new Map();
  for (const p of products) {
    const f = family(p);
    if (!f) { output.push(p); continue; }
    const key = `${p.supplier || 'Whimsy Tech'}:${f[0]}`;
    let group = groups.get(key);
    if (!group) {
      group = { ...p, id: `family:${key}`, title: f[1], images: [], variants: [] };
      groups.set(key, group); output.push(group);
    }
    group.images.push(...p.images.filter(i => !group.images.includes(i)));
    group.variants.push(...p.variants.map(v => ({ ...v, productTitle: v.productTitle || p.title, url: v.url || p.url })));
  }
  for (const g of groups.values()) {
    g.variants.sort((a, b) => {
      const packA = /variety pack/i.test(a.title), packB = /variety pack/i.test(b.title);
      if (packA !== packB) return packA ? 1 : -1;
      return a.title.localeCompare(b.title, 'en', { numeric: true });
    });
  }
  return output;
}
