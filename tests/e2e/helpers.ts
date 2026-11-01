import {expect,type Page} from '@playwright/test';
export async function login(page:Page,portal:'student'|'mentor'|'sponsor'|'convener'|'tutor',username:string=portal){
  await page.goto(`/login/${portal}`);await page.getByLabel('Username',{exact:true}).waitFor();const demo=page.getByRole('button',{name:'Use demonstration',exact:true});if(await demo.count())await demo.click();
  await page.getByLabel('Username',{exact:true}).fill(username);
  await page.getByLabel('Password',{exact:true}).fill('Capstone2026!');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
}

export async function declareMentor(page:Page){await login(page,'mentor');await page.goto('/mentor/interests');await page.getByLabel('Maximum number of groups').fill('5');await page.getByLabel('Experience, interests and availability').fill('Available to support five capstone groups.');await page.getByRole('button',{name:'Submit interest'}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();}
export async function confirmGroup(page:Page,group:string,projectTitle?:string){
 await login(page,'convener');await page.goto('/coordinator/interests');const approve=page.getByRole('button',{name:'Approve interest'});if(await approve.count())await approve.first().click();await page.goto('/coordinator/allocation');
 await page.getByRole('button',{name:new RegExp(group)}).first().click();await page.getByLabel('Decision reason',{exact:true}).fill('The group skills and approach suit the project.');await page.getByRole('button',{name:'Approve for allocation'}).click();
 if(projectTitle)await page.getByLabel('Project from group preferences').selectOption({label:projectTitle});await page.getByLabel('Allocation rationale').fill('Preference, demonstrated skills and mentor availability align.');await page.getByRole('button',{name:'Review allocation',exact:true}).click();await page.getByRole('button',{name:'Confirm allocation',exact:true}).click();await expect(page.getByText(`Project allocated to ${group}.`,{exact:true})).toBeVisible();
}
