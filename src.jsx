import {groupCatalog} from './catalog-groups';
import {OrderPreview} from './order-preview';
import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Trash2, ShoppingBag, Search, Plus, Minus, Download, Box, Check, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import './style.css';

const asset = p => p?.startsWith('/') ? import.meta.env.BASE_URL + p.slice(1) : p;
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const categories = ['All parts', 'Electronics', 'Metal', 'Wheels', 'Motion', 'Screws', 'Shoulder screws', 'Standoffs', 'Nuts', 'Spacers', 'Pneumatics'];

function AddToCart({ available, onAdd }) {
  const [added, setAdded] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  function handleAdd() {
    if (onAdd() === false) return;
    clearTimeout(timer.current);
    setAdded(n => n + 1);
    timer.current = setTimeout(() => setAdded(0), 1500);
  }
  return (
    <Button className="w-full" variant={added ? 'secondary' : 'default'} disabled={!available} onClick={handleAdd}>
      {added ? <Check key={added} className="animate-in zoom-in-50 duration-200 motion-reduce:animate-none" /> : <Plus />}
      <span aria-live="polite">{!available ? 'Sold out' : added ? 'Added to cart' : 'Add to cart'}</span>
    </Button>
  );
}

function ProductCard({ product: p, selected, onSelect, onAdd, query }) {
  const v = p.variants.find(v => v.id === selected) || (query && p.variants.find(v => `${v.title} ${v.sku}`.toLowerCase().includes(query.toLowerCase()))) || p.variants[0];
  const supplier = p.supplier || 'Whimsy Tech';
  const options = p.variants.map(v => ({ value: v.id, label: v.title + (!v.available ? ' — sold out' : '') }));
  return (
    <Card size="sm">
      {v.image || p.images[0] ? (
        <img src={asset(v.image || p.images[0])} alt={p.title} loading="lazy" decoding="async" className="aspect-square w-full object-contain p-4" />
      ) : (
        <Empty className="aspect-square"><EmptyHeader><EmptyMedia variant="icon"><Box /></EmptyMedia><EmptyDescription>No supplier photo</EmptyDescription></EmptyHeader></Empty>
      )}
      <CardHeader>
        <Button variant="ghost" size="sm" className="w-fit px-0" nativeButton={false} render={<a href={v.url || p.url} target="_blank" rel="noreferrer" />}>
          <Avatar size="sm" className="rounded-none after:hidden"><AvatarImage className={`rounded-none object-contain ${supplier==='HCU Tech'?'invert':''}`} src={asset(supplier === 'VEX Robotics' ? '/logos/vex.ico' : supplier === 'HCU Tech' ? '/logos/hcu.png' : supplier === 'Robosource' ? '/logos/robosource-favicon.ico' : '/logos/whimsy-favicon.png')} alt="" /><AvatarFallback className="rounded-none bg-transparent">{supplier[0]}</AvatarFallback></Avatar>
          {supplier}<ArrowUpRight />
        </Button>
        <CardTitle>{p.title}</CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-4">
        {p.variants.length > 1 && (
          <Select items={options} value={v.id} onValueChange={onSelect}>
            <SelectTrigger className="w-full min-w-0" aria-label={`Variant for ${p.title}`}><SelectValue /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <p className="font-medium tabular-nums">{v.price==null?'Price unavailable':money(v.price)}</p>
      </CardContent>
      <CardFooter><AddToCart key={v.id} available={v.available} onAdd={() => onAdd(p, v)} /></CardFooter>
    </Card>
  );
}

function App() {
const[data,setData]=useState({products:[],requested:[]}),[query,setQuery]=useState(''),[category,setCategory]=useState('Start'),[cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('v5-cart')||'[]')}catch{return[]}}),[open,setOpen]=useState(false),[selected,setSelected]=useState({}),[error,setError]=useState('');
useEffect(()=>{fetch(import.meta.env.BASE_URL+'data/catalog.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>setData({...d,products:groupCatalog(d.products)})).catch(()=>setError('Catalog could not be loaded. Please refresh.'))},[]);
// Refresh saved-cart photos when the catalog receives new processed assets.
useEffect(()=>{if(!data.products.length)return;const images=new Map(data.products.flatMap(p=>p.variants.map(v=>[v.id,v.image])));setCart(c=>c.map(x=>images.has(x.id)?{...x,image:images.get(x.id)}:x));},[data.products]);
useEffect(()=>{localStorage.setItem('v5-cart',JSON.stringify(cart))},[cart]);
const change=(id,n)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:Math.max(0,Math.min(9999,n))}:x).filter(x=>x.qty));
const add=(p,v)=>{if(cart.some(x=>x.id===v.id&&x.qty>=9999))return false;setCart(c=>c.some(x=>x.id===v.id)?c.map(x=>x.id===v.id?{...x,qty:Math.min(9999,x.qty+1)}:x):[...c,{...v,product:v.productTitle||p.title,url:v.url||p.url,supplier:p.supplier||'Whimsy Tech',qty:1}]);return true;};
const total=cart.reduce((s,x)=>s+x.price*x.qty,0),count=cart.reduce((s,x)=>s+x.qty,0);
const productCategory=p=>/shoulder/i.test(p.title)?'Shoulder screws':p.category;
const items=data.products.filter(p=>(category==='All parts'||category==='Start'||productCategory(p)===category)&&`${p.title} ${p.variants.map(v=>v.title+' '+v.sku).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const [visibleCount, setVisibleCount] = useState(24);
  const loadMoreRef = useRef(null);
  useEffect(() => setVisibleCount(24), [category, query]);
  useEffect(() => {
    if (!loadMoreRef.current || visibleCount >= items.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        setVisibleCount(n => n + 24);
      }
    }, { rootMargin: '400px' });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, items.length, category, query]);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Button variant="ghost" nativeButton={false} render={<a href={import.meta.env.BASE_URL} />}>V5 / PARTS</Button>
          {category!=='Start'&&<div className={`order-3 w-full sm:order-none ${category==='Start'&&!query?'mx-auto mt-24 sm:max-w-xl':'sm:max-w-sm'}`}>
            <InputGroup>
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput aria-label="Search parts" placeholder="Search parts…" value={query} onChange={e => setQuery(e.target.value)} />
            </InputGroup>
          </div>}
          <SheetTrigger render={<Button variant="outline" />}><ShoppingBag />Your order<Badge variant="secondary">{count}</Badge></SheetTrigger>
        </header>
        <Separator />
        <main className="py-6">
          {category==='Start'&&<div className="mx-auto mb-8 max-w-xl space-y-6 py-12 text-center"><h1 className="text-3xl font-semibold tracking-tight">Find parts for your next build</h1><InputGroup><InputGroupAddon><Search/></InputGroupAddon><InputGroupInput aria-label="Search parts" placeholder="Search parts…" value={query} onChange={e=>setQuery(e.target.value)}/></InputGroup></div>}
          <Tabs value={category} onValueChange={setCategory}>
            <ScrollArea className="w-full">
              <div className="mx-auto flex w-max"><TabsList aria-label="Part categories">
                {categories.map(c => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
              </TabsList></div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <TabsContent value={category} className="space-y-6 py-6">
              {(category!=='Start'||query)&&<h1 className="text-2xl font-semibold tracking-tight">{category==='Start'?'Search results':category}</h1>}
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(category==='Start'&&!query?[]:items).slice(0, visibleCount).map(p => <ProductCard key={p.id} product={p} query={query} selected={selected[p.id]} onSelect={value => setSelected(s => ({ ...s, [p.id]: value }))} onAdd={add} />)}
              </div>
              {(category!=='Start'||query)&&visibleCount < items.length && <div ref={loadMoreRef} className="flex justify-center"><Button variant="outline" onClick={() => setVisibleCount(n => n + 24)}>Load more parts</Button></div>}
              {!items.length && !error && <Empty><EmptyHeader><EmptyMedia variant="icon"><Search /></EmptyMedia><EmptyTitle>No parts found</EmptyTitle><EmptyDescription>Try a different search or category.</EmptyDescription></EmptyHeader></Empty>}
            </TabsContent>
          </Tabs>
          <Separator />
          <p className="py-6 text-xs text-muted-foreground">Prices in USD. Shipping and tax excluded.</p>
        </main>
      </div>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader><SheetTitle>Your order ({count})</SheetTitle><SheetDescription>Review quantities, then export your parts list.</SheetDescription></SheetHeader>
        <Separator />
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            {cart.length ? cart.map(x => (
              <Card key={x.id} size="sm">
                <CardHeader><CardTitle>{x.product}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    {x.image && <img src={asset(x.image)} alt="" className="size-16 shrink-0 object-contain" />}
                    <p className="min-w-0 text-sm text-muted-foreground">{x.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" aria-label={`Decrease ${x.product}`} onClick={() => change(x.id, x.qty - 1)}><Minus /></Button>
                    <Input className="w-20 text-center" aria-label={`Quantity for ${x.product}`} type="number" min="1" max="9999" value={x.qty} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n > 0) change(x.id, n); }} />
                    <Button variant="outline" size="icon" aria-label={`Increase ${x.product}`} onClick={() => change(x.id, x.qty + 1)}><Plus /></Button>
                    <strong className="ml-auto tabular-nums">{money(x.price * x.qty)}</strong>
                  </div>
                </CardContent>
                <CardFooter><Button variant="ghost" size="icon" aria-label={`Delete ${x.product}`} onClick={() => change(x.id, 0)}><Trash2/></Button></CardFooter>
              </Card>
            )) : (
              <Empty><EmptyHeader><EmptyMedia variant="icon"><ShoppingBag /></EmptyMedia><EmptyTitle>Your order is empty.</EmptyTitle><EmptyDescription>Add parts to put your order together.</EmptyDescription></EmptyHeader><EmptyContent><SheetClose render={<Button variant="outline" />}>Browse parts</SheetClose></EmptyContent></Empty>
            )}
          </div>
        </ScrollArea>
        <Separator />
        <SheetFooter>
          <div className="flex justify-between text-base font-semibold"><span>Subtotal</span><span>{money(total)}</span></div>
          <p className="text-xs text-muted-foreground">USD · Tax and shipping excluded. Exports are order lists; purchase directly from the supplier.</p>
          <OrderPreview cart={cart}/>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
createRoot(document.getElementById('root')).render(<App />);
