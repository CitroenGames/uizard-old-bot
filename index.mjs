import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import path from 'path';
import clipboardy from 'clipboardy';

import PluginStealth from 'puppeteer-extra-plugin-stealth';
puppeteer.use(PluginStealth());

import config from './config.json' assert { type: 'json' };
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const { pageUrl } = config;

const DELAY_TYPING = getRandomInt(5000, 10000);

async function navigateToMainPage(pageUrl) {
  console.log('Navigating to the main page');
  await page.goto(pageUrl);
}

async function setDelay() {
  console.log(`going wait for ${DELAY_TYPING} ms`);
  await sleep(DELAY_TYPING);
}

async function run() {
  const userAgents = fs.readFileSync('useragents.txt', 'utf-8').split('\n');
  const browser = await puppeteer.launch({
    headless: config.headless,
    executablePath: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  while (true) {
    const USER_AGENT = getRandomUserAgent(userAgents);
    console.log('Using user agent:', USER_AGENT);
    const [width, height] = [1280, 720];
    console.log(`Using resolution: ${width}x${height}`);
    try {
      await page.setUserAgent(USER_AGENT);

      // Set a random viewport size
      await page.setViewport({ width, height });
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
      await navigateToMainPage(pageUrl);
      await setDelay();
      await page.goto('https://uizard.io/autodesigner/dashboard/');
      await setDelay();
      await navigateToMainPage();

      await sleep(getRandomInt(3000, 8000));
      const selEmail = 'input[type="email"]';
      const email = getRandomEmail();
      console.log(`Generated email: ${email}`);

      if (config.autodo) {
        // Add random typing delay
        const DELAY_TYPING = getRandomInt(50, 200);
        await page.type(selEmail, email, { delay: DELAY_TYPING });

        // Add random delay before clicking the button
        const DELAY_CLICK = getRandomInt(500, 2000);
        await sleep(DELAY_CLICK);

        console.log('Clicking "Get early access" button');
        await page.click('button[type=submit]');

        console.log('Waiting for "Signing up..." text');
        await page.waitForFunction(
          () => {
            for (const elSpan of document.querySelectorAll('span')) {
              if (elSpan.textContent === 'Signing up...') {
                return true;
              }
            }
            return false;
          },
          { timeout: 10000 }
        );
      } else {
        clipboardy.writeSync(email);
        console.log(
          'Email copied to clipboard. Please paste the email and click "Sign up".'
        );
        // Wait for user input
        await page.waitForSelector(`${selEmail}:not([value=""])`, {
          timeout: 0,
        });
      }

      console.log('Waiting for navigation to complete');
      const interval = setInterval(() => {
        console.log(`Current navigation point: ${page.url()}`);
      }, 2000);

      try {
        await page.waitForNavigation({ timeout: 60000 });
      } catch (error) {
        console.error('Navigation error:', error.message);
        clearInterval(interval);
        await browser.close();
        continue;
      }

      clearInterval(interval);

      const url = page.url();
      const isRedirected = url.startsWith(
        'https://uizard.io/autodesigner/dashboard/?slug='
      );
      if (isRedirected) {
        console.log(`Redirected to the dashboard: ${url}`);
      } else {
        console.log('Did not redirect to the dashboard, trying again');
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      if (browser) {
        console.log(
          `Waiting for ${config.delay} ms before starting the next iteration.`
        );
        await sleep(config.delay);
      }
    }
  }
}

async function readProxiesFromFile() {
  const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n');
  return proxies
    .map((proxy) => proxy.trim())
    .filter((proxy) => proxy.length > 0);
}

async function removeProxyFromFile(proxyToRemove) {
  const proxies = await readProxiesFromFile();
  const filteredProxies = proxies.filter((proxy) => proxy !== proxyToRemove);
  fs.writeFileSync('proxy.txt', filteredProxies.join('\n'), 'utf-8');
}

function getRandomUserAgent(userAgents) {
  const USER_AGENT = userAgents[Math.floor(Math.random() * userAgents.length)];
  return USER_AGENT.replace(/[\n\r]/g, '').trim();
}

function getRandomEmail() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let email = '';
  for (let i = 0; i < 10; i++) {
    email += chars[Math.floor(Math.random() * chars.length)];
  }
  email += '@';
  for (let i = 0; i < 10; i++) {
    email += chars[Math.floor(Math.random() * chars.length)];
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
  const resolution =
    resolutions[Math.floor(Math.random() * resolutions.length)].split('x');
  return [parseInt(resolution[0]), parseInt(resolution[1])]; // Added missing square bracket
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await run();
})();
