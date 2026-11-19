import base from './playwright.config';
export default {...base, webServer:{command:'npm run start -- --hostname 127.0.0.1 --port 3152',url:'http://127.0.0.1:3152',reuseExistingServer:false,timeout:60000},use:{...base.use,baseURL:'http://127.0.0.1:3152'}};
