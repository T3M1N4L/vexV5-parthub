"""Requires curl and beautifulsoup4. Run from the project root."""
import json,re,time
from pathlib import Path
from urllib.parse import urljoin,urlparse
from concurrent.futures import ThreadPoolExecutor
import subprocess
from types import SimpleNamespace
from bs4 import BeautifulSoup
BASE='https://www.robosource.net'
def get(url):
 r=subprocess.run(['curl','-fsSL','--max-time','45',url],capture_output=True,check=True);return SimpleNamespace(content=r.stdout,text=r.stdout.decode('utf8',errors='replace'))
urls=set();counts={}
for collection in ['star-drive-screws-steel','shoulder-screws-steel','nylon-screws-nuts']:
 url=BASE+'/'+collection;seen=set();found=set()
 while url:
  if url in seen: raise RuntimeError('Pagination repeated')
  seen.add(url);s=BeautifulSoup(get(url).text,'html.parser')
  cards=s.select('.ajax_block_product')
  if not cards:raise RuntimeError('No product listing found')
  for card in cards:
   a=card.select_one('a.product-name')
   if a and re.search(r'\b(screws?|nuts?)\b' if collection=='nylon-screws-nuts' else r'\bscrews?\b',a.get('title','')+' '+a.get_text(),re.I):found.add(a['href'])
  nxt=s.select_one('link[rel=next]');url=urljoin(url,nxt['href']) if nxt else None
 urls.update(found);counts[collection]={'pages':len(seen),'products':len(found)}
urls.add(BASE+'/robot-parts/screws-hardware/nuts/251-thin-nylock-nuts')
Path('public/images').mkdir(exist_ok=True)
def parse(url):
 html=get(url).text;s=BeautifulSoup(html,'html.parser')
 title=s.select_one('h1[itemprop=name]') or s.select_one('h1');title=title.get_text(' ',strip=True)
 ref=s.select_one('#product_reference [itemprop=sku]');ref=ref.get_text(strip=True) if ref else None
 price=s.select_one('#our_price_display');price=float(price.get('content') or price.get_text().replace('$','').replace(',',''))
 pid=s.select_one('#product_page_product_id')['value'];pid='robo-'+pid
 if s.select('#attributes select option'):raise RuntimeError('Product options require variant parsing: '+url)
 image=s.select_one('#bigpic');images=[]
 if image:
  imageurl=urljoin(url,image['src']);r=get(imageurl);ext=Path(urlparse(imageurl).path).suffix;local='/images/'+pid+ext;Path('public'+local).write_bytes(r.content);images=[local]
 if not ref or not images:raise RuntimeError('Missing reference or image: '+url)
 available=s.select_one('[itemprop=availability]');available=bool(available and 'InStock' in available.get('href',''))
 return {'id':pid,'title':title,'url':url,'supplier':'Robosource','category':'Shoulder screws' if 'shoulder' in title.lower() else 'Nuts' if 'nut' in title.lower() else 'Screws','images':images,'variants':[{'id':pid,'title':title,'sku':ref,'price':price,'available':available,'options':([re.search(r', (Yellow|Orange|Red|Light Green|Dark Green|Light Blue|Dark Blue|Purple|Black|Brown|Pink|White|Beige)$',title).group(1)] if re.search(r', (Yellow|Orange|Red|Light Green|Dark Green|Light Blue|Dark Blue|Purple|Black|Brown|Pink|White|Beige)$',title) else []),'image':images[0]}]}
with ThreadPoolExecutor(max_workers=4) as pool:products=list(pool.map(parse,sorted(urls)))
path=Path('public/data/catalog.json');data=json.loads(path.read_text());data['products']=[p for p in data['products'] if p.get('supplier')!='Robosource']+products;data['robosourceUpdatedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());data['robosourceCoverage']=counts;path.write_text(json.dumps(data,indent=2))
Path('public/logos/robosource.jpg').write_bytes(get(BASE+'/img/robosourcenet-logo-1759764516.jpg').content)
print(json.dumps({'coverage':counts,'imported':len(products),'missingReferences':0,'missingImages':0},indent=2))
