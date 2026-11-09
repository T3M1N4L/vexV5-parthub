"""Import the requested McMaster parts via Jina's rendered-page proxy.

Run from the project root. --source-dir reuses saved SKU.md responses for review.
Product photos and favicon are downloaded locally; the website needs no proxy.
"""
import argparse,json,re,subprocess,time
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',type=Path)
args=parser.parse_args()

def fetch(url,headers=()):
    command=['curl','-fLsS','--max-time','75']
    for header in headers:command+=['-H',header]
    return subprocess.check_output(command+[url])

def parse(sku,category,text):
    # Reject shell-only responses instead of manufacturing a product or price.
    heading=re.search(r'^# (.+)$',text,re.M)
    detail=re.search(r'^### (.+)$',text,re.M)
    price=re.search(r'\$([\d,.]+) (?:per pack of (\d+)|(each))\s',text)
    image=re.search(r'!\[[^\]]*\]\((https://www\.mcmaster\.com/[^)]+/'+sku+r'_[^)]*@4x[^)]+)\)',text)
    if not all([heading,detail,price,image]) or not re.search(r'^\s*'+sku+r'\s*$',text,re.M) or 'ADD TO ORDER' not in text:
        raise RuntimeError('Incomplete rendered product details for '+sku)
    pack=int(price.group(2) or 1)
    title=f'{heading[1]}, {detail[1]}' + (f' ({pack}-pack)' if pack>1 else '')
    pid='mcmaster-'+sku
    local='/images/'+pid+'.png'
    content=fetch(image[1])
    if not content.startswith(b'\x89PNG\r\n\x1a\n'):raise RuntimeError('Expected product PNG for '+sku)
    Path('public'+local).write_bytes(content)
    return {'id':pid,'title':title,'supplier':'McMaster-Carr','category':category,
        'url':f'https://www.mcmaster.com/{sku}/','sourceImageUrl':image[1],
        'images':[local],'variants':[{'id':pid,'title':detail[1]+(f' / {pack}-pack' if pack>1 else ' / each'),
        'sku':sku,'price':float(price[1].replace(',','')),'packQuantity':pack,'available':True,'options':[],'image':local}]}

products=[]
for sku,category in [('95856A215','Nuts'),('92510A468','Spacers')]:
    text=(args.source_dir/(sku+'.md')).read_text() if args.source_dir else fetch('https://r.jina.ai/https://www.mcmaster.com/'+sku+'/',
        ['X-Timeout: 60','X-Wait-For-Selector: h1','X-No-Cache: true']).decode()
    products.append(parse(sku,category,text))
# Fetch everything before modifying the catalog, keeping failures safe to retry.
favicon=fetch('https://www.mcmaster.com/init/gfx/favicon/192x192.png')
if not favicon.startswith(b'\x89PNG\r\n\x1a\n'):raise RuntimeError('Invalid favicon')
Path('public/logos/mcmaster-favicon.png').write_bytes(favicon)
path=Path('public/data/catalog.json');data=json.loads(path.read_text())
ids={p['id'] for p in products}
data['products']=[p for p in data['products'] if p['id'] not in ids]+products
data['mcmasterUpdatedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
data['mcmasterSource']='Supplier product pages rendered through https://r.jina.ai/'
path.with_suffix('.json.tmp').write_text(json.dumps(data,indent=2))
path.with_suffix('.json.tmp').replace(path)
for p in products:print(p['title'],p['variants'][0]['sku'],p['variants'][0]['price'])
