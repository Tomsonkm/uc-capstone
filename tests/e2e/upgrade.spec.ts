import {test,expect} from '@playwright/test';
import {login} from './helpers';
test('two main portals include tutor and mentors have no allocation controls',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:'Staff portal',exact:true}).click();await expect(page.getByRole('link',{name:'Tutor portal',exact:true})).toBeVisible();
 await login(page,'mentor');await expect(page.getByRole('navigation').getByRole('link',{name:'Allocation',exact:true})).toHaveCount(0);
 await page.goto('/mentor/allocation');await expect(page.getByRole('heading',{name:'This page is for another role'})).toBeVisible();
});
test('sponsor proposal requires convenor review before publication',async({page})=>{
 await login(page,'sponsor');await page.goto('/sponsor/proposals');await page.getByRole('button',{name:'New proposal'}).click();
 await page.getByLabel('Project title',{exact:true}).fill('Community booking prototype');await page.getByLabel('Description and requirements').fill('Build an accessible community booking service.');
 await page.getByLabel('Required skills, separated by commas').fill('React, UX research');await page.getByLabel('Expected deliverables, one per line').fill('Working prototype\nUsability report');
 await page.getByRole('button',{name:'Submit for approval'}).click();await expect(page.getByText('Pending approval',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await login(page,'convener');await page.goto('/coordinator/proposals');
 const card=page.locator('article').filter({hasText:'Community booking prototype'});await card.getByLabel('Review reason').fill('Good scope for a student group.');await card.getByRole('button',{name:'Approve proposal'}).click();
 await card.getByRole('button',{name:'Publish project'}).click();await page.goto('/coordinator/projects?q=Community+booking+prototype');await expect(page.getByRole('link',{name:/Community booking prototype/})).toBeVisible();
});
test('tutor has interest status and a separate convenor communication channel',async({page})=>{
 await page.goto('/login/tutor');await page.getByLabel('Username',{exact:true}).waitFor();const demo=page.getByRole('button',{name:'Use demonstration',exact:true});if(await demo.count())await demo.click();
 await page.getByLabel('Username',{exact:true}).fill('tutor');await page.getByLabel('Password',{exact:true}).fill('Capstone2026!');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.goto('/tutor/interests');await page.getByLabel('Maximum number of groups').fill('2');await page.getByLabel('Experience, interests and availability').fill('Available for two weekly tutorial groups.');await page.getByRole('button',{name:'Submit interest'}).click();await expect(page.getByText('Pending',{exact:true})).toBeVisible();
 await page.goto('/tutor/messages');await page.getByRole('button',{name:'Contact convenor'}).click();await page.getByLabel('Your message',{exact:true}).fill('I am available for tutorials this semester.');await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page.getByText('I am available for tutorials this semester.',{exact:true})).toBeVisible();
});
