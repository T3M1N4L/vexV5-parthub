import {test,expect} from 'vitest';
import XLSX from 'xlsx-js-style';
import {unzipSync,strFromU8} from 'fflate';
import {createWorkbook,columns} from './order-workbook';
const rows=[{name:'Fender Washer',variant:'White / 0.750" / 10 pcs',sku:'',supplier:'Whimsy Tech',url:'https://www.whimsytech.net/products/fender-washer',comments:'Team spare',qty:2,price:7.49},{name:'Motor',variant:'11W',sku:'276-4840',supplier:'VEX Robotics',url:'https://www.vexrobotics.com/276-4840.html',qty:1,price:49.99}];
test('export matches the seven-column form with numbered rows, links and shipping totals',()=>{
 const wb=createWorkbook(rows,false,{'Parts Order':5});const ws=wb.Sheets['Parts Order'];
 expect(XLSX.utils.sheet_to_json(ws,{header:1})[0]).toEqual(columns);
 expect(ws['!ref']).toBe('A1:G19');
 expect(ws.A2.v).toBe(1);expect(ws.A3.v).toBe(2);
 expect(ws.C2.v).toBe('Fender Washer — White / 0.750" / 10 pcs');
 expect(ws.G2.v).toContain('Team spare');expect(ws.G2.l.Target).toBe(rows[0].url);
 expect(ws.F2).toMatchObject({v:14.98,f:'D2*E2'});
 expect(ws.F17).toMatchObject({v:64.97,f:'SUM(F2:F16)'});
 expect(ws.F18.v).toBe(5);expect(ws.F19).toMatchObject({v:69.97,f:'SUM(F17:F18)'});
 const zip=unzipSync(new Uint8Array(XLSX.write(wb,{bookType:'xlsx',type:'array'})));
 const styles=strFromU8(zip['xl/styles.xml']);
 expect(styles).toContain('name val="Calibri"');
 expect(styles).toContain('style="thin"');
 expect(styles).toContain('wrapText="true"');
 expect(strFromU8(zip['xl/worksheets/sheet1.xml'])).toContain('<f>D2*E2</f>');
});
test('supplier sheets number independently, keep shipping separate, and expand for large orders',()=>{
 const wb=createWorkbook(rows,true,{'VEX Robotics':4});
 expect(wb.SheetNames).toEqual(['Whimsy Tech','VEX Robotics']);
 expect(wb.Sheets['Whimsy Tech'].F18.v).toBe('');expect(wb.Sheets['Whimsy Tech'].F19.v).toBe(14.98);
 expect(wb.Sheets['VEX Robotics'].F18.v).toBe(4);expect(wb.Sheets['VEX Robotics'].A2.v).toBe(1);
 const large=createWorkbook(Array.from({length:20},()=>rows[1]),false).Sheets['Parts Order'];
 expect(large.A21.v).toBe(20);expect(large.F22.f).toBe('SUM(F2:F21)');
});
test('editable descriptions, SKUs and comments cannot inject spreadsheet formulas',()=>{
 const ws=createWorkbook([{...rows[0],description:'=1+1',sku:'+danger',url:'',comments:'@danger'}],false).Sheets['Parts Order'];
 expect(ws.B2.v).toBe("'+danger");expect(ws.C2.v).toBe("'=1+1");expect(ws.G2.v).toBe("'@danger");
});
