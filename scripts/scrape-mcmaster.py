"""Import the requested McMaster parts via Jina's rendered-page proxy.

Run from the project root. --source-dir reuses saved SKU.md responses for review.
Product photos and favicon are downloaded locally; the website needs no proxy.
"""
import argparse,json,re,subprocess,time
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--source-dir',type=Path)
parser.add_argument('--washers-only',action='store_true',help='Refresh the verified #8 plastic fender-washer alternatives only')
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

washer_skus=['90295A638','95630A817','95611A226','95630A445']
requested=[(sku,'Spacers') for sku in washer_skus]
if not args.washers_only:requested=[('95856A215','Nuts'),('92510A468','Spacers')]+requested
products=[]
for sku,category in requested:
    text=(args.source_dir/(sku+'.md')).read_text() if args.source_dir else fetch('https://r.jina.ai/https://www.mcmaster.com/'+sku+'/',
        ['X-Timeout: 60','X-Wait-For-Selector: h1','X-No-Cache: true']).decode()
    product=parse(sku,category,text)
    if sku in washer_skus:
        def spec(name):
            value=re.search(r'^'+re.escape(name)+r' (.+)$',text,re.M)
            if not value:raise RuntimeError('Missing washer specification '+name+' for '+sku)
            return value[1]
        specs={name:spec(name) for name in ['Material','For Screw Size','ID','OD','Thickness','Color']}
        if specs['For Screw Size']!='No. 8' or specs['OD'] not in ['0.750"','1.000"','1.500"']:
            raise RuntimeError('Washer does not fit the requested #8 / outside diameter family')
        product['family']='plastic-fender-washer-alternatives'
        product['specifications']=specs
        variant=product['variants'][0]
        variant['title']=f"{specs['Material']} / {specs['Color']} / {specs['OD']} OD / {specs['Thickness']} thick / {variant['packQuantity']}-pack"
        variant['note']='Alternative for #8 screws; material and thickness differ from Whimsy acetal washers.'
        if sku=='95630A445':variant['note']='Thinner alternative: 0.027–0.035 inch PTFE, versus Whimsy’s 0.0625 inch acetal. For #8 screws.'
        product['title']=f"{specs['Material']} Fender Washer Alternative for #8 Screws — {specs['OD']} OD, {specs['Thickness']} Thick ({variant['packQuantity']}-pack)"
    products.append(product)
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
