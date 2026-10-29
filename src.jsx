import {groupCatalog} from './catalog-groups';
import {OrderPreview} from './order-preview';
import React, { useEffect, useState, useRef } from 'react';
import {flushSync} from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Menu, Trash2, ShoppingBag, Search, Plus, Minus, Download, Box, Check, ArrowUpRight } from 'lucide-react';
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
const categories = ['All parts', 'Electronics', 'Metal', 'Wheels', 'Compression Wheels', 'Motion', 'Screws', 'Standoffs', 'Nuts', 'Spacers', 'Pneumatics'];

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

function SupplierFilters({supplier,onSupplier}) {
  return <div className="space-y-1"><p className="mb-3 px-2 text-xs text-muted-foreground">SUPPLIER</p>{['All suppliers','Whimsy Tech','Robosource','VEX Robotics','HCU Tech'].map(s=><Button key={s} variant={supplier===s?'secondary':'ghost'} className="w-full justify-start" onClick={()=>onSupplier(s)}>{s}</Button>)}</div>;
}
function MobileBrowse({category,onCategory,supplier,onSupplier}) {
  const [open,setOpen]=useState(false);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger render={<Button variant="outline"/>}><Menu/>Browse</SheetTrigger><SheetContent side="left" className="w-[min(320px,90vw)]"><SheetHeader><SheetTitle>Browse parts</SheetTitle><SheetDescription>Choose a category or supplier.</SheetDescription></SheetHeader><ScrollArea className="min-h-0 flex-1"><div className="space-y-8 p-4"><div className="space-y-1"><p className="mb-3 px-2 text-xs text-muted-foreground">CATEGORIES</p>{categories.map(c=><Button key={c} variant={category===c?'secondary':'ghost'} className="w-full justify-start" onClick={()=>{onCategory(c);setOpen(false)}}>{c}</Button>)}</div><SupplierFilters supplier={supplier} onSupplier={s=>{onSupplier(s);setOpen(false)}}/></div></ScrollArea></SheetContent></Sheet>;
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
const [supplier,setSupplier]=useState('All suppliers');
const productCategory=p=>/compression wheel/i.test(p.title)?'Compression Wheels':/shoulder/i.test(p.title)||p.category==='Shoulder screws'?'Screws':p.category;
const items=data.products.filter(p=>(supplier==='All suppliers'||(p.supplier||'Whimsy Tech')===supplier)&&(category==='All parts'||category==='Start'||productCategory(p)===category)&&`${p.title} ${p.variants.map(v=>v.title+' '+v.sku).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const [visibleCount, setVisibleCount] = useState(24);
  const loadMoreRef = useRef(null);
  useEffect(() => setVisibleCount(24), [category, query, supplier]);
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
  }, [visibleCount, items.length, category, query, supplier]);
  const home=category==='Start'&&!query.trim()&&supplier==='All suppliers';
  const transition=update=>{
    if(document.startViewTransition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)document.startViewTransition(()=>flushSync(update));else update();
  };
  const chooseCategory=c=>transition(()=>setCategory(c));
  const chooseSupplier=s=>transition(()=>{setSupplier(s);if(category==='Start')setCategory('All parts')});
  const search=value=>{if(home&&value.trim())transition(()=>{setQuery(value);setCategory('All parts')});else setQuery(value)};
  const searchBox=<InputGroup className="h-11"><InputGroupAddon><Search/></InputGroupAddon><InputGroupInput aria-label="Search parts" placeholder="Search parts…" value={query} onChange={e=>search(e.target.value)}/></InputGroup>;
  const cartTrigger=<SheetTrigger render={<Button variant="outline"/>}><ShoppingBag/>Your order{count>0&&<Badge variant="secondary">{count}</Badge>}</SheetTrigger>;
  return <Sheet open={open} onOpenChange={setOpen}>
    <div className={`mx-auto max-w-[1440px] px-4 sm:px-8 ${home?'flex min-h-[100svh] flex-col items-center justify-center gap-8 py-16':''}`}>
      <header className={home?'flex w-full max-w-xl flex-col items-center gap-8':'flex flex-wrap items-center justify-between gap-3 py-5 sm:gap-6'}>
        <Button variant="ghost" className={`px-0 ${home?'h-auto hover:bg-transparent':''}`} onClick={()=>transition(()=>{setCategory('Start');setQuery('');setSupplier('All suppliers')})}><span role={home?'heading':undefined} aria-level={home?1:undefined} style={{viewTransitionName:'brand'}} className={home?'text-4xl font-semibold tracking-tight sm:text-5xl':'text-lg font-semibold tracking-tight'}>V5 Parts</span></Button>
        <div style={{viewTransitionName:'search'}} className={`w-full ${home?'':'order-3 md:order-none md:max-w-lg'}`}>{searchBox}</div>
        <div className="flex gap-2"><div className="md:hidden"><MobileBrowse category={category} onCategory={chooseCategory} supplier={supplier} onSupplier={chooseSupplier}/></div>{cartTrigger}</div>
      </header>
      {home&&<div className="hidden max-w-2xl flex-wrap justify-center gap-2 md:flex">{categories.map(c=><Button key={c} variant="ghost" onClick={()=>chooseCategory(c)}>{c}</Button>)}</div>}
      {!home&&
        <Tabs value={category} onValueChange={chooseCategory}>
          <div className="hidden py-3 md:block"><ScrollArea><div className="mx-auto flex w-max"><TabsList variant="line" aria-label="Part categories">{categories.map(c=><TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList></div><ScrollBar orientation="horizontal"/></ScrollArea></div>
          <div className="flex gap-10 pt-6">
            <aside className="hidden w-44 shrink-0 md:block"><div className="sticky top-6"><SupplierFilters supplier={supplier} onSupplier={chooseSupplier}/></div></aside>
            <TabsContent value={category} className="min-w-0 flex-1 space-y-6 pb-10">
              <div className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{category==='Start'?'Search results':category}</h1>{supplier!=='All suppliers'&&<p className="text-sm text-muted-foreground">{supplier}</p>}</div>
              {error&&<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 xl:grid-cols-3">{items.slice(0,visibleCount).map(p=><ProductCard key={p.id} product={p} query={query} selected={selected[p.id]} onSelect={value=>setSelected(s=>({...s,[p.id]:value}))} onAdd={add}/>)}</div>
              {visibleCount<items.length&&<div ref={loadMoreRef} className="flex justify-center"><Button variant="outline" onClick={()=>setVisibleCount(n=>n+24)}>Load more parts</Button></div>}
              {!items.length&&!error&&<Empty><EmptyHeader><EmptyMedia variant="icon"><Search/></EmptyMedia><EmptyTitle>No parts found</EmptyTitle><EmptyDescription>Try another category, supplier or search.</EmptyDescription></EmptyHeader></Empty>}
            </TabsContent>
          </div>
        </Tabs>
      }
    </div>
    <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
      <SheetHeader className="p-6"><SheetTitle className="flex items-center gap-2 text-xl">Your order<Badge variant="secondary">{count}</Badge></SheetTitle><SheetDescription>Your parts, ready to review.</SheetDescription></SheetHeader>
      <ScrollArea className="min-h-0 flex-1"><div className="px-6">
        {cart.length?cart.map(x=><div key={x.id} className="flex gap-4 border-b py-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border">{x.image?<img src={asset(x.image)} alt="" loading="lazy" className="size-full object-contain p-2"/>:<Box className="text-muted-foreground"/>}</div>
          <div className="min-w-0 flex-1 space-y-2"><p className="text-[11px] text-muted-foreground">{x.supplier||'Whimsy Tech'}</p><h3 className="text-sm font-medium leading-snug">{x.product}</h3>{x.title!==x.product&&<p className="text-xs text-muted-foreground">{x.title}</p>}
            <div className="flex items-center gap-1 pt-1"><Button variant="ghost" size="icon-sm" disabled={x.qty<=1} aria-label={`Decrease ${x.product}`} onClick={()=>change(x.id,x.qty-1)}><Minus/></Button><Input className="h-7 w-12 border-0 px-0 text-center" aria-label={`Quantity for ${x.product}`} inputMode="numeric" value={x.qty} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>0)change(x.id,n)}}/><Button variant="ghost" size="icon-sm" aria-label={`Increase ${x.product}`} onClick={()=>change(x.id,x.qty+1)}><Plus/></Button></div>
          </div>
          <div className="flex flex-col items-end justify-between"><Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Delete ${x.product}`} onClick={()=>change(x.id,0)}><Trash2/></Button><strong className="text-sm font-medium tabular-nums">{money(x.price*x.qty)}</strong></div>
        </div>):<Empty className="py-20"><EmptyHeader><EmptyMedia variant="icon"><ShoppingBag/></EmptyMedia><EmptyTitle>Your order is empty.</EmptyTitle><EmptyDescription>Find something for your next build.</EmptyDescription></EmptyHeader><EmptyContent><SheetClose render={<Button variant="outline"/>}>Browse parts</SheetClose></EmptyContent></Empty>}
      </div></ScrollArea>
      <SheetFooter className="gap-4 border-t p-6"><div className="flex justify-between text-lg font-semibold"><span>Subtotal</span><span>{money(total)}</span></div><OrderPreview cart={cart}/><p className="text-center text-[11px] text-muted-foreground">USD · Shipping and tax excluded</p></SheetFooter>
    </SheetContent>
  </Sheet>;
}
createRoot(document.getElementById('root')).render(<App />);
