import XLSX from 'xlsx-js-style';

export const columns=['Item #','Part#','Brief Description','Unit Price','Quantity','Ext Price','Hyperlink; Comments or concerns'];
export const minimumRows=15;
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const cents=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const safe=x=>typeof x==='string'&&/^[=+@\-\t\r]/.test(x)?"'"+x:x;
export function descriptionFor(row){
 if(row.description!==undefined)return row.description;
 const variant=row.variant?.replace(/\s*\/\s*(?:each|\d+-pack)$/i,'').trim();
 return variant&&variant!==row.name&&!row.name.toLowerCase().includes(variant.toLowerCase())?`${row.name} — ${row.variant}`:row.name;
}
export function orderGroups(rows,split){
 return (split?[...new Set(rows.map(r=>r.supplier))]:['Parts Order']).map(name=>({name,items:split?rows.filter(r=>r.supplier===name):rows}));
}
const edge={style:'thin',color:{rgb:'000000'}};
const cellStyle={font:{name:'Calibri',sz:11,color:{rgb:'000000'}},fill:{patternType:'solid',fgColor:{rgb:'FFFFFF'}},border:{top:edge,bottom:edge,left:edge,right:edge},alignment:{vertical:'center',horizontal:'center',wrapText:true}};
function styleCell(cell,column,header=false){
 cell.s={...cellStyle,font:{...cellStyle.font,bold:header},alignment:{...cellStyle.alignment,horizontal:header?'center':[2,6].includes(column)?'left':'center'}};
 if(!header&&[3,5].includes(column))cell.z='"$"#,##0.00';
 return cell;
}
export function createWorkbook(rows,split,shipping={}){
 const wb=XLSX.utils.book_new();
 for(const {name,items} of orderGroups(rows,split)){
  const count=Math.max(minimumRows,items.length),subtotal=cents(items.reduce((s,r)=>s+cents(r.qty*r.price),0));
  const freight=shipping[name]===''||shipping[name]==null?'':cents(shipping[name]);
  const data=[columns,...Array.from({length:count},(_,i)=>{
   const r=items[i];return r?[i+1,r.sku,descriptionFor(r),Number(r.price),Number(r.qty),cents(r.qty*r.price),[r.url,r.comments].filter(Boolean).join('\n')].map(safe):[i+1,'','',0,1,0,''];
  }),['','','Subtotal','','',subtotal,''],['','','Shipping','','',freight,freight===''?'(to be filled in later)':''],['','','Total','','',cents(subtotal+Number(freight)), '']];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=[12.86,28,28,13.29,11.57,16.71,56].map(wch=>({wch}));
  ws['!rows']=data.map((_,i)=>({hpt:i===0?32:i<=items.length?Math.max(32,Math.ceil(descriptionFor(items[i-1]).length/28)*14+10):21.75}));
  for(let row=0;row<data.length;row++)for(let col=0;col<7;col++){
   const address=XLSX.utils.encode_cell({r:row,c:col});ws[address]=styleCell(ws[address]||{t:'s',v:''},col,row===0);
   if(row>count&&(col<2||col===6))ws[address].s={...ws[address].s,border:{}};
  }
  for(let i=0;i<count;i++){
   const n=i+2;ws['F'+n].f=`D${n}*E${n}`;
   if(items[i]&&/^https:\/\//.test(items[i].url)){
    ws['G'+n].l={Target:items[i].url};ws['G'+n].s={...ws['G'+n].s,font:{...cellStyle.font,color:{rgb:'0563C1'},underline:true}};
   }
  }
  const subtotalRow=count+2,totalRow=count+4;
  ws['F'+subtotalRow].f=`SUM(F2:F${count+1})`;
  ws['F'+totalRow].f=`SUM(F${subtotalRow}:F${subtotalRow+1})`;
  for(let row=subtotalRow;row<=totalRow;row++)ws['C'+row].s={...ws['C'+row].s,font:{...cellStyle.font,bold:true}};
  XLSX.utils.book_append_sheet(wb,ws,name.replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Supplier');
 }
 return wb;
}
