import {login,declareMentor,confirmGroup} from './helpers';
import {test,expect} from '@playwright/test';

test('source catalogue preserves duplicate IDs, full scope and separate ranked choices',async({page})=>{
 await login(page,'student');await page.goto('/student/projects');
 await expect(page.locator('.project-card')).toHaveCount(66);
 await expect(page.getByRole('link',{name:/A more connected Canberra/})).toHaveCount(0);
 await page.getByLabel('Search projects').fill('2026-S2-05');
 await expect(page.locator('.project-card')).toHaveCount(2);
 await page.getByRole('button',{name:'Add to preferences'}).nth(0).click();
 await page.getByRole('button',{name:'Add to preferences'}).click();
 await page.getByRole('link',{name:/Team Plus Motorsport Wheel/}).click();
 await expect(page.getByRole('heading',{name:'Project scope'})).toBeVisible();
 await expect(page.getByText(/Test Plan including demonstrating results match/)).toBeVisible();
 await expect(page.getByText(/sign an activity injury liability waiver/)).toBeVisible();
 await expect(page.getByText('Mentor not assigned',{exact:true})).toBeVisible();
 await page.goto('/student/projects?q=2026-S2-53');await page.getByRole('button',{name:'Add to preferences'}).click();
 await page.goto('/student/preferences');
 await expect(page.getByRole('heading',{name:/Postpartum Depression/})).toBeVisible();
 await expect(page.getByRole('heading',{name:/Team Plus Motorsport Wheel/})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Capstone Project Management Web Application'})).toBeVisible();
 for(let i=0;i<3;i++){
  await page.getByLabel('Why is your group a good fit?').nth(i).fill('Our skills cover web development, research and project management.');
  await page.getByLabel('How would you complete this project?').nth(i).fill('We will analyse requirements, prototype, develop and validate the project.');
  await page.getByLabel('How would you complete this project?').nth(i).blur();
 }
 await page.getByRole('button',{name:'Review application'}).click();await page.getByRole('button',{name:'Submit group EOI'}).click();
 await expect(page.getByText('Application submitted for convenor review.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await declareMentor(page);await confirmGroup(page,'The Innovators','Team Plus Motorsport Wheel Alignment Sensor Development - Phase 2');
 await page.reload();await page.goto('/coordinator/projects?q=2026-S2-05');
 await expect(page.locator('.project-card').filter({hasText:'Team Plus Motorsport'}).getByText('Allocated',{exact:true})).toBeVisible();
 await expect(page.locator('.project-card').filter({hasText:'Postpartum Depression'}).getByText('Available',{exact:true})).toBeVisible();
});

test('long source briefs fit on a phone and project ID search reaches the final populated entry',async({page})=>{
 await page.setViewportSize({width:375,height:850});await login(page,'student');await page.goto('/student/projects?q=2026-S2-69');
 await expect(page.locator('.project-card')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:/AI-Enabled Multilingual Video/}).click();await expect(page.getByText(/human-in-the-loop review and approval prior to publication/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'docs/screenshots/catalogue-mobile-detail.png',fullPage:true});
});
