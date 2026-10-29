// Present supplier listings as families without changing variant identities.
function family(p) {
  const supplier = p.supplier || 'Whimsy Tech';
  if (supplier === 'Robosource') {
    const color = /^Color Coded /i.test(p.title);
    const title = p.title.replace(/^Color Coded /i, '');
    if (/^Star Drive Screws/i.test(title)) return [color ? 'color-star' : 'star', `${color ? 'Color Coded ' : ''}Star Drive Screws`];
    if (/^Shoulder Screws/i.test(title)) return [color ? 'color-shoulder' : 'shoulder', `${color ? 'Color Coded ' : ''}Shoulder Screws`];
  }
  if (supplier === 'VEX Robotics') {
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
    const key = `${p.supplier}:${f[0]}`;
    let group = groups.get(key);
    if (!group) {
      group = { ...p, id: `family:${key}`, title: f[1], images: [], variants: [] };
      groups.set(key, group); output.push(group);
    }
    group.images.push(...p.images.filter(i => !group.images.includes(i)));
    group.variants.push(...p.variants.map(v => ({ ...v, productTitle: p.title, url: v.url || p.url })));
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
