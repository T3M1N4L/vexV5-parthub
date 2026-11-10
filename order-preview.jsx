import React,{useState} from 'react';
import XLSX from 'xlsx-js-style';
import {zipSync,strToU8} from 'fflate';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Table,TableHeader,TableHead,TableBody,TableRow,TableCell,TableFooter} from '@/components/ui/table';
import {Trash2,Download} from 'lucide-react';
import {columns,minimumRows,descriptionFor,orderGroups,money,createWorkbook} from './order-workbook';
export {createWorkbook} from './order-workbook';
function saveBlob(bytes,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export function OrderPreview({cart}){
 const [rows,setRows]=useState([]),[split,setSplit]=useState(false),[shipping,setShipping]=useState({});
 const initialize=()=>{setRows(cart.map(x=>({id:x.id,name:x.product,description:descriptionFor({name:x.product,variant:x.title}),url:x.url,sku:x.sku||'',supplier:x.supplier||'Whimsy Tech',qty:x.qty,price:x.price,comments:x.note||''})));setShipping({});};
 const edit=(id,key,value)=>setRows(rs=>rs.map(r=>r.id===id?{...r,[key]:value}:r));
 const groups=orderGroups(rows,split);
 const valid=rows.length>0&&rows.every(r=>r.description.trim()&&Number.isInteger(Number(r.qty))&&Number(r.qty)>0&&r.price!==''&&Number(r.price)>=0&&Number.isFinite(Number(r.price)))&&groups.every(g=>shipping[g.name]==null||shipping[g.name]===''||(Number.isFinite(Number(shipping[g.name]))&&Number(shipping[g.name])>=0));
 function download(type){const normalized=rows.map(r=>({...r,qty:Number(r.qty),price:Number(r.price)}));const wb=createWorkbook(normalized,split,shipping);if(type==='csv'&&split){const files=Object.fromEntries(wb.SheetNames.map(n=>[n+'.csv',strToU8(XLSX.utils.sheet_to_csv(wb.Sheets[n]))]));saveBlob(zipSync(files),'parts-orders-by-supplier.zip');}else XLSX.writeFile(wb,`parts-order.${type}`,{bookType:type});}
 const cell='border border-neutral-400 px-2 py-1 text-black';
 const input='h-auto min-h-8 w-full rounded-none border-0 bg-transparent px-1 text-black shadow-none dark:bg-transparent placeholder:text-neutral-500 focus-visible:border-neutral-700 focus-visible:ring-neutral-300';
 return <Dialog>
  <DialogTrigger render={<Button disabled={!cart.length} onClick={initialize}/>}>Preview & export order</DialogTrigger>
  <DialogContent className="max-h-[96dvh] w-[96vw] max-w-none grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden sm:max-w-[96vw]">
   <DialogHeader><DialogTitle>Order spreadsheet</DialogTitle><DialogDescription>Edit the table before downloading. Item numbers, columns and totals match your order form. Changes apply to this export.</DialogDescription></DialogHeader>
   <div className="min-h-0 max-h-[60vh] space-y-6 overflow-auto">
    {groups.map(({name,items})=>{
     const subtotal=Math.round(items.reduce((s,r)=>s+Math.round(Number(r.qty)*Number(r.price)*100),0))/100;
     return <section key={name} aria-label={`${name} spreadsheet`}>
      {split&&<p className="mb-2 text-sm font-medium">{name}</p>}
      <div className="min-w-[1240px] bg-white p-2 text-black [color-scheme:light]">
       <Table className="table-fixed border-collapse bg-white text-[13px] text-black">
        <colgroup>{[90,196,196,93,81,117,392,40].map((w,i)=><col key={i} style={{width:w}}/>)}</colgroup>
        <TableHeader><TableRow className="hover:bg-transparent">{columns.map(c=><TableHead key={c} className={`${cell} h-12 whitespace-normal text-center font-bold`}>{c}</TableHead>)}<TableHead className="w-10 bg-white"><span className="sr-only">Delete</span></TableHead></TableRow></TableHeader>
        <TableBody>{Array.from({length:Math.max(minimumRows,items.length)},(_,i)=>{
         const r=items[i];return <TableRow key={r?.id||`blank-${i}`} className="hover:bg-transparent">
          <TableCell className={`${cell} text-center`}>{i+1}</TableCell>
          <TableCell className={cell}>{r&&<Input aria-label={`sku for ${r.name}`} className={input} value={r.sku} onChange={e=>edit(r.id,'sku',e.target.value)}/>}</TableCell>
          <TableCell className={`${cell} whitespace-normal`}>{r&&<Textarea rows={2} aria-label={`description for ${r.name}`} className={`${input} min-h-16 resize-y`} value={r.description} onChange={e=>edit(r.id,'description',e.target.value)}/>}</TableCell>
          <TableCell className={`${cell} text-center`}>{r?<Input aria-label={`price for ${r.name}`} className={`${input} text-center`} type="number" min="0" step="0.01" value={r.price} onChange={e=>edit(r.id,'price',e.target.value)}/>:money(0)}</TableCell>
          <TableCell className={`${cell} text-center`}>{r?<Input aria-label={`qty for ${r.name}`} className={`${input} text-center`} type="number" min="1" step="1" value={r.qty} onChange={e=>edit(r.id,'qty',e.target.value)}/>:1}</TableCell>
          <TableCell className={`${cell} text-center tabular-nums`}>{money(r?Number(r.qty)*Number(r.price)||0:0)}</TableCell>
          <TableCell className={cell}>{r&&<><Textarea rows={2} aria-label={`Link for ${r.name}`} className={`${input} min-h-12 resize-y text-blue-700`} value={r.url} onChange={e=>edit(r.id,'url',e.target.value)}/><Input aria-label={`Comments for ${r.name}`} placeholder="Comments or concerns" className={input} value={r.comments} onChange={e=>edit(r.id,'comments',e.target.value)}/></>}</TableCell>
          <TableCell className="bg-white px-0 text-black">{r&&<Button variant="ghost" size="icon-sm" className="text-neutral-600 hover:bg-neutral-100 hover:text-black" aria-label={`Delete ${r.name} from export`} onClick={()=>setRows(rs=>rs.filter(x=>x.id!==r.id))}><Trash2/></Button>}</TableCell>
         </TableRow>;
        })}</TableBody>
        <TableFooter className="border-0 bg-white font-normal">{['Subtotal','Shipping','Total'].map(label=><TableRow key={label} className="hover:bg-transparent"><TableCell colSpan={2}/><TableCell className={`${cell} text-center font-bold`}>{label}</TableCell><TableCell className={cell}/><TableCell className={cell}/><TableCell className={`${cell} text-center tabular-nums`}>{label==='Shipping'?<Input aria-label={`Shipping for ${name}`} className={`${input} text-center`} type="number" min="0" step="0.01" placeholder="—" value={shipping[name]??''} onChange={e=>setShipping(s=>({...s,[name]:e.target.value}))}/>:money(subtotal+(label==='Total'?(Number(shipping[name])||0):0))}</TableCell><TableCell className="px-2 text-neutral-500">{label==='Shipping'&&!shipping[name]?'(to be filled in later)':''}</TableCell><TableCell/></TableRow>)}</TableFooter>
       </Table>
      </div>
     </section>;
    })}
   </div>
   <div className="space-y-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={split} onCheckedChange={setSplit}/>Separate by supplier (Excel tabs / CSV files in ZIP)</label>
   {!valid&&<p role="alert" className="text-sm text-destructive">Include at least one description, a positive whole quantity, and valid nonnegative prices and shipping.</p>}</div>
   <DialogFooter><Button disabled={!valid} onClick={()=>download('xlsx')}><Download/>Export Excel</Button><Button variant="outline" disabled={!valid} onClick={()=>download('csv')}><Download/>Export CSV</Button></DialogFooter>
  </DialogContent>
 </Dialog>;
}
