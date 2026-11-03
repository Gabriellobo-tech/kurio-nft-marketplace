import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './visual',
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  reporter: [['html',{outputFolder:'visual-report',open:'never'}]],
  use: {baseURL: 'http://localhost:4173',trace:'retain-on-failure'},
  expect:{toHaveScreenshot:{animations:'disabled',caret:'hide',maxDiffPixelRatio:0.002}},
  projects:[
    {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
  ],
  webServer:{command:'npm run preview',url:'http://localhost:4173',reuseExistingServer:!process.env.CI},
});
