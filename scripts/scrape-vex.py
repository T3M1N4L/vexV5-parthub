import json,re,subprocess,urllib.parse,concurrent.futures
from pathlib import Path
from bs4 import BeautifulSoup
BASE='https://www.vexrobotics.com/'
sources={
'Electronics':['276-4840','276-4811','276-7043','276-4852','276-4855','276-6050','276-4810','276-4820','276-4831','276-8659','276-4842','v5-smart-cables'],
'Wheels':['wheels','compression-wheels','276-2214'],
'Motion':['6p-sprockets','hs-hardware','drive-shafts','hs-sprockets-and-chain','gears','275-1262','275-1029'],
'Metal':['276-7285','gussets','channel','aluminum-kits','275-1065']}
def get(u):return subprocess.check_output(['curl','-fsSL','--max-time','60',u])
def gql(q):
 d=json.loads(get(BASE+'graphql?query='+urllib.parse.quote(q)))
 if d.get('errors'):raise RuntimeError(d['errors'])
 return d['data']['products']['items']
fields='name sku stock_status price_range{minimum_price{final_price{value currency}}} image{url}'
records={};coverage=[]
def scrape(pair):
 cat,slug=pair;url=BASE+slug+'.html';html=get(url).decode();s=BeautifulSoup(html,'html.parser');f=s.select_one('form[data-product-sku]')
 if not f:raise RuntimeError('No product SKU on '+url)
 sku=f['data-product-sku'];extra=' ... on ConfigurableProduct{variants{product{'+fields+'}}}'
 q='{products(filter:{sku:{eq:'+json.dumps(sku)+'}}){items{'+fields+extra+' ... on GroupedProduct{items{product{'+fields+extra+'}}}}}}'
 items=gql(q);out=[]
 for item in items:
  children=[x['product'] for x in item.get('items',[])] or [item]
  flat=[]
  for child in children:flat.extend([v['product'] for v in child.get('variants',[])] or [child])
  for p in flat:
   name=p['name'].lower()
   if slug=='276-4840' and not ('cartridge' in name or '11w' in name):continue
   if slug=='hs-hardware' and 'kit' in name:continue
   if slug=='v5-smart-cables' and 'crimp' in name:continue
   if slug=='gears' and any(x in name for x in ['rack','kit']):continue
   if slug=='gussets' and p['sku']=='276-1110':continue
   if slug=='channel' and 'aluminum' not in name:continue
   if slug=='aluminum-kits' and not ('1x1x35' in name and 'angle' in name):continue
   if slug=='hs-sprockets-and-chain' and not ('sprocket' in name or ('chain' in name and ('link' in name or 'kit' in name or 'additional' in name))):continue
   p['name']=__import__('html').unescape(p['name'])
   if slug=='hs-sprockets-and-chain' and 'sprocket' in name:p['name']+=' (9P)'
   p.update(category=cat,url=url);out.append(p)
 # Magento custom checkbox options carry the individual wheel SKUs.
 custom=gql('{products(filter:{sku:{eq:'+json.dumps(sku)+'}}){items{... on CustomizableProductInterface{options{title ... on CustomizableCheckboxOption{value{title sku price}}}}}}}')
 imageMap={}
 marker='optionAdditionalImages('
 if marker in html:
  config=json.JSONDecoder().raw_decode(html.split(marker,1)[1])[0]
  for opt in config.get('options',{}).values():
   for vid,val in opt.get('values',{}).items():
    for image in val.get('images',{}).values():
     urlimg=image.get('full') or image.get('img') or image.get('base') or image.get('image') or image.get('url')
     if not urlimg:
      for vv in image.values():
       if isinstance(vv,str) and vv.startswith('https:') and '70x70' not in vv and '88x110' not in vv:urlimg=vv;break
     if urlimg:imageMap[str(vid)]=urlimg;break
 for root in custom:
  for opt in root.get('options') or []:
   if slug=='wheels' and 'Mecanum' in opt['title']:continue
   for v in opt.get('value') or []:
    if not v.get('sku'):continue
    element=next((e for e in s.select('.value-sku') if v['sku'] in e.get_text()),None)
    parent=element.find_parent('div',class_='field') if element else None
    inp=parent.select_one('input[type=checkbox]') if parent else None
    image=imageMap.get(inp.get('value')) if inp else None
    # Keep supplier options even if the supplier has no option photo.
    out.append({'name':v['title'],'sku':v['sku'],'stock_status':'IN_STOCK','price_range':{'minimum_price':{'final_price':{'currency':'USD','value':v['price']}}},'image':{'url':image},'category':cat,'url':url})
 if any(p['sku']!=sku for p in out):out=[p for p in out if p['sku']!=sku]
 if slug=='compression-wheels':
  for tr in s.select('tr[data-child-id]'):
   nxt=tr.find_next_sibling('tr');node=nxt.select_one('[data-th=SKU]') if nxt else None
   part=node.get_text(strip=True) if node else None
   if part and not any(p['sku']==part for p in out):
    image=tr.select_one('img');title=tr.select_one('.product-item-name').get_text(' ',strip=True)
    out.append({'name':title,'sku':part,'stock_status':'OUT_OF_STOCK','price_range':{'minimum_price':{'final_price':{'value':None,'currency':'USD'}}},'image':{'url':image.get('data-full-src') or image['src']},'category':cat,'url':url,'sourceNote':'EU listing exists; US catalog does not publish price or availability.'})
 return slug,out
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for slug,items in pool.map(scrape,[(c,s) for c,ss in sources.items() for s in ss]):
  coverage.append({'page':slug,'included':len(items)})
  for p in items:records[p['sku']]=p
# Search the US catalog to resolve the duplicated U-channel/9P link.
for term in ['9P sprocket','U-Channel']:
 for p in gql('{products(search:'+json.dumps(term)+',pageSize:100){items{'+fields+'}}}'):
  if (term.startswith('9P') and '9p' in p['name'].lower()) or (term=='U-Channel' and 'u-channel' in p['name'].lower()):
   p.update(category='Motion' if term.startswith('9P') else 'Metal',url=BASE+'catalogsearch/result/?q='+urllib.parse.quote(p['sku']));records[p['sku']]=p
Path('public/images').mkdir(exist_ok=True)
def convert(p):
 price=p['price_range']['minimum_price']['final_price'];assert price['currency']=='USD'
 image=None
 if p['image']['url']:
  image='/images/vex-'+p['sku']+'.jpg';full=re.sub(r'/cache/[a-f0-9]+/', '/', p['image']['url']);Path('public'+image).write_bytes(get(full));p['image']['url']=full
 return {'id':'vex-'+p['sku'],'title':p['name'],'supplier':'VEX Robotics','category':p['category'],'url':p['url'],'sourceImageUrl':p['image']['url'],'images':[image] if image else [],'variants':[{'id':'vex-'+p['sku'],'title':p['name'],'sku':p['sku'],'price':price['value'],'available':p['stock_status']=='IN_STOCK','image':image,'options':[]}]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:products=list(pool.map(convert,records.values()))
path=Path('public/data/catalog.json');d=json.loads(path.read_text());d['products']=[p for p in d['products'] if p.get('supplier')!='VEX Robotics']+products;d['vexCoverage']=coverage;path.write_text(json.dumps(d,indent=2));print(json.dumps(coverage));print('VEX products:',len(products))
