import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',timeout:45000,use:{baseURL:'http://127.0.0.1:5173',headless:true,screenshot:'only-on-failure'},workers:1,reporter:'list',webServer:{command:'pnpm dev',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:120000},projects:[{name:'chromium',use:{browserName:'chromium',channel:'chrome'}}]});
