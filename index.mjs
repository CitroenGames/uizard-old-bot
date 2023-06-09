import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import path from 'path';
import clipboardy from 'clipboardy';

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

import config from './config.json' assert { type: 'json' };
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const pageUrl = config.pageUrl;

async function run() {
  let userAgents = fs.readFileSync('useragents.txt', 'utf-8').split('\n');
  let resolutions = fs.readFileSync('resolutions.txt', 'utf-8').split('\n');
  let browser;
  browser = await puppeteer.launch({
          headless: config.headless,
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
  const page = await browser.newPage();
  const antibotdelay = getRandomInt(5000,10000);

  while (true) {
    const userAgent = getRandomUserAgent(userAgents);
    console.log('Using user agent:', userAgent);
    const [viewportWidth, viewportHeight] = getRandomResolution(resolutions);
    console.log('Using resolution:', viewportWidth, 'x', viewportHeight);
    try {
      await page.setUserAgent(userAgent);

      // Set a random viewport size
      await page.setViewport({ width: viewportWidth, height: viewportHeight });
/*      if (config.useProxy) {
        const proxies = await readProxiesFromFile();
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];
        const [proxyHost, proxyPort, proxyUsername, proxyPassword] = proxy.split(':');

        try {
        const ProxyChain = require('proxy-chain');
        const newProxyUrl = await ProxyChain.anonymizeProxy(`http://${proxyHost}:${proxyPort}`);
        await page.authenticate({ username: proxyUsername, password: proxyPassword });
        await page.setRequestInterception(true);

        page.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          request.abort();
          } else {
            request.continue({ proxyUrl: newProxyUrl });
        }
        });
        } catch (error) {
          console.log('Invalid proxy:', proxy);
          await removeProxyFromFile(proxy);
          throw new Error('Invalid proxy');
        }
      }*/
      console.log('Navigating to the main page');
      await page.goto(`${pageUrl}`);
      console.log(`going wait for ${antibotdelay} ms`)
      await delay(antibotdelay);
      await page.goto(`https://uizard.io/autodesigner/dashboard/`);
      console.log(`going wait for ${antibotdelay} ms`)
      await delay(antibotdelay);
      await page.goto(`${pageUrl}`);
      await delay(getRandomInt(3000,8000));
      const emailInputSelector = 'input[type="email"]';
      const email = getRandomEmail();
      console.log('Generated email:', email);

      if (config.autodo) {
        // Add random typing delay
        const typingDelay = getRandomInt(50, 200);
        await page.type(emailInputSelector, email, { delay: typingDelay });

        // Add random delay before clicking the button
        const clickDelay = getRandomInt(500, 2000);
                await delay(clickDelay);

        console.log('Clicking "Get early access" button');
        await page.evaluate(() => {
          const spanElements = document.querySelectorAll('span');
          for (let span of spanElements) {
            if (span.textContent === 'Get early access') {
              span.click();
              break;
            }
          }
        });

        console.log('Waiting for "Signing up..." text');
        await page.waitForFunction(
          () => {
            const spanElements = document.querySelectorAll('span');
            for (let span of spanElements) {
              if (span.textContent === 'Signing up...') {
                return true;
              }
            }
            return false;
          },
          { timeout: 10000 }
        );
      } else {
        console.log('Email copied to clipboard. Please paste the email and click "Sign up".');
        clipboardy.writeSync(email);
        // Wait for user input
        await page.waitForSelector(emailInputSelector + ':not([value=""])', { timeout: 0 });
      }

      console.log('Waiting for navigation to complete');
      const navigationPromise = page.waitForNavigation({ timeout: 60000 });
      const interval = setInterval(() => {
        console.log('Current navigation point:', page.url());
      }, 2000);

      try {
        await navigationPromise;
      } catch (error) {
        console.error('Navigation error:', error.message);
        clearInterval(interval);
        await browser.close();
        continue;
      }

      clearInterval(interval);

      const currentUrl = page.url();
      if (currentUrl.startsWith('https://uizard.io/autodesigner/dashboard/?slug=')) {
        console.log('Redirected to the dashboard:', currentUrl);
      } else {
        console.log('Did not redirect to the dashboard, trying again');
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      if (browser) {
        console.log(`Waiting for ${config.delay} ms before starting the next iteration.`);
        await delay(config.delay);
      }
    }
  }
}

async function readProxiesFromFile() {
  const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n');
  return proxies.map(proxy => proxy.trim()).filter(proxy => proxy.length > 0);
}

async function removeProxyFromFile(proxyToRemove) {
  const proxies = await readProxiesFromFile();
  const filteredProxies = proxies.filter(proxy => proxy !== proxyToRemove);
  fs.writeFileSync('proxy.txt', filteredProxies.join('\n'), 'utf-8');
}

function getRandomUserAgent(userAgents) {
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  return userAgent.replace(/[\n\r]/g, '').trim(); // Remove newline characters and trim spaces
}

function getRandomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let email = '';
  for (let i = 0; i < 10; i++) {
    email += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  email += '@';
  for (let i = 0; i < 10; i++) {
    email += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  email += '.com';
  return email;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomResolution(resolutions) {
  const resolution = resolutions[Math.floor(Math.random() * resolutions.length)].split('x');
  return [parseInt(resolution[0]), parseInt(resolution[1])]; // Added missing square bracket
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  await run();
})();

