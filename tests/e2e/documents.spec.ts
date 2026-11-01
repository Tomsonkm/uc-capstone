import {test,expect} from '@playwright/test';
import {login} from './helpers';
test('documents retain latest and earlier versions in a private group channel',async({page})=>{
 await login(page,'student','ethan.davis');await page.goto('/student/messages');await page.getByRole('button',{name:'Open private team channel'}).click();await page.goto('/student/documents');
 for(const version of [1,2]){await page.getByLabel('Document title',{exact:true}).fill('Project report');await page.getByLabel('Project file',{exact:true}).setInputFiles({name:`report-v${version}.pdf`,mimeType:'application/pdf',buffer:Buffer.from(`%PDF-1.7\nTest version ${version}`)});await page.getByRole('button',{name:'Upload document',exact:true}).click();await expect(page.getByText(`Latest · v${version}`,{exact:true})).toBeVisible();}
 await page.reload();await expect(page.getByRole('button',{name:'Download version 1',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Download version 2',exact:true})).toBeVisible();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download version 1',exact:true}).click();expect((await downloadEvent).suggestedFilename()).toBe('report-v1.pdf');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await login(page,'sponsor','david.park');await page.goto('/sponsor/documents');await expect(page.getByRole('heading',{name:'Project report',exact:true})).toHaveCount(0);
});
test('unsafe uploads are rejected without a successful document record',async({page})=>{
 await login(page,'student','ethan.davis');await page.goto('/student/messages');await page.getByRole('button',{name:'Open private team channel'}).click();await page.goto('/student/documents');await page.getByLabel('Document title',{exact:true}).fill('Unsafe file');await page.getByLabel('Project file',{exact:true}).setInputFiles({name:'not-a-pdf.pdf',mimeType:'application/pdf',buffer:Buffer.from('<html>unsafe</html>')});await page.getByRole('button',{name:'Upload document',exact:true}).click();await expect(page.getByRole('alert')).toContainText('not a valid PDF');await expect(page.getByText('Latest · v1',{exact:true})).toHaveCount(0);
});
