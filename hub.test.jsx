// @vitest-environment jsdom
import {test,expect,vi} from 'vitest';
import {screen,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as XLSX from 'xlsx';
vi.mock('xlsx',async()=>{const actual=await vi.importActual('xlsx');return {...actual,writeFile:vi.fn()}});
test('variant cart persists, quantities calculate, and both exports contain real row data',async()=>{
 // jsdom lacks the browser animation API used by registry ScrollArea.
 Element.prototype.getAnimations=()=>[];
 const user=userEvent.setup();
 vi.stubGlobal('ResizeObserver',class { observe(){} unobserve(){} disconnect(){} });
 document.body.innerHTML='<div id="root"></div>';
 const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},configurable:true});
 global.fetch=vi.fn(async()=>({ok:true,json:async()=>({updatedAt:'2026-10-26T12:00:00Z',products:[{id:'test',title:'Test screw',category:'Screws',url:'https://example.com/test',images:[],variants:[{id:'1',title:'Red / 1 inch',sku:'TEST-RED',price:2.5,available:true},{id:'2',title:'Blue / 2 inch',sku:'TEST-BLUE',price:3,available:true}]}]})}));
 await import('./src.jsx');
 await screen.findByText('Test screw');
 await user.click(screen.getByRole('combobox',{name:'Variant for Test screw'}));
 await user.click(await screen.findByRole('option',{name:'Blue / 2 inch'}));
 fireEvent.click(screen.getByText('Add to cart'));
 await screen.findByText('Added to cart');
 expect(screen.queryByLabelText('Supplier')).toBeNull();
 expect(screen.queryByText('TEST-BLUE')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Your order/}));
 fireEvent.click(screen.getByLabelText('Increase Test screw'));
 await waitFor(()=>expect(JSON.parse(values.get('v5-cart'))[0].qty).toBe(2));
 expect(screen.getAllByText('$6.00').length).toBe(2);
 fireEvent.click(screen.getByText('Export Excel'));
 fireEvent.click(screen.getByText('Export CSV'));
 expect(XLSX.writeFile).toHaveBeenCalledTimes(2);
 const wb=XLSX.writeFile.mock.calls[0][0];
 const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
 const read=XLSX.read(bytes,{type:'array'});
 const rows=XLSX.utils.sheet_to_json(read.Sheets['Parts Order']);
 expect(rows[0]).toMatchObject({'Part #':'TEST-BLUE','Qty':2,'Unit Cost':3,'Line Total':6,Variant:'Blue / 2 inch'});
 const csv=XLSX.utils.sheet_to_csv(wb.Sheets['Parts Order']);expect(csv).toContain('TEST-BLUE');
 fireEvent.click(screen.getByText('Remove'));
 await screen.findByText('Your order is empty.');
 expect(screen.getByText('Export CSV').disabled).toBe(true);
});
