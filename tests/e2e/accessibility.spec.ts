import {login} from './helpers';
import {test,expect} from '@playwright/test';
test('responsive navigation, filters and no page overflow',async({page})=>{
 await login(page,'student');
 for(const width of [1440,1024,768,375]){
  await page.setViewportSize({width,height:1000});await page.goto('/student/projects');
  await expect(page.getByRole('heading',{name:'Find your next big idea.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByLabel('Search projects').fill('no-such-project');await expect(page.getByRole('heading',{name:'No projects found'})).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();await expect(page.getByRole('link',{name:/Smart Gate/})).toBeVisible();
  if(width<780){await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('link',{name:'My group',exact:true}).click();await expect(page.getByRole('heading',{name:'Better, together.'})).toBeVisible();}
 }
});
test('password visibility is keyboard accessible',async({page})=>{
 await page.goto('/login/student');const password=page.getByLabel('Password',{exact:true});await password.fill('Capstone2026!');
 await page.getByRole('button',{name:'Show password',exact:true}).focus();await page.keyboard.press('Enter');await expect(password).toHaveAttribute('type','text');
 await page.getByRole('button',{name:'Hide password',exact:true}).click();await expect(password).toHaveAttribute('type','password');
});
test('mobile shortlist stays within reach and opens a sheet',async({page})=>{
 await page.setViewportSize({width:375,height:850});await login(page,'student');await page.goto('/student/projects');
 await page.getByRole('button',{name:'Add to preferences'}).first().click();await page.getByRole('button',{name:'Review shortlist'}).click();
 await expect(page.getByRole('dialog',{name:'Your project preferences'})).toBeVisible();await expect(page.getByRole('dialog').getByText('Smart Gate',{exact:true})).toBeVisible();
});
test('convenor can select applications at tablet width and membership replacement is absent',async({page})=>{
 await page.setViewportSize({width:1024,height:850});await login(page,'convener');await page.goto('/coordinator/allocation');await page.getByRole('button',{name:/Blueprints/}).click();await expect(page.getByRole('heading',{name:'Blueprints',exact:true})).toBeVisible();await page.goto('/coordinator/rounds');await expect(page.getByRole('heading',{name:'Membership correction'})).toHaveCount(0);
});

test('sponsor direct links cannot expose another sponsor workspace',async({page})=>{
 await login(page,'sponsor');
 await page.goto('/sponsor/workspace/project-8');await expect(page.getByRole('heading',{name:'Workspace unavailable'})).toBeVisible();
 await expect(page.getByText('We mapped the key user journeys and reviewed the sample water usage data.')).toHaveCount(0);
});
test('a submitted group can replace a preference through an unsent revision draft',async({page})=>{
 await login(page,'student','mia.thompson');await page.goto('/student/preferences');
 await page.getByRole('button',{name:'Remove A more connected Canberra'}).click();await expect(page.getByText('You have unsent changes.',{exact:true})).toBeVisible();
 await page.goto('/student/projects');await page.locator('article').filter({has:page.getByRole('link',{name:/Smart Gate/})}).getByRole('button',{name:'Add to preferences'}).click();
 await page.goto('/student/preferences');await page.getByLabel('Why is your group a good fit?').nth(2).fill('Our group has SQL and development experience.');await page.getByLabel('How would you complete this project?').nth(2).fill('We will validate requirements, prototype, build and test.');await page.getByLabel('How would you complete this project?').nth(2).blur();
 await page.getByRole('button',{name:'Review changes'}).click();await page.getByRole('button',{name:'Send updated application'}).click();await expect(page.getByText('Application updated.',{exact:true})).toBeVisible();await expect(page.getByText('You have unsent changes.',{exact:true})).toHaveCount(0);
});
