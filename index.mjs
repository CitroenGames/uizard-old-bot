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
  let browser;

  while (true) {
    const userAgent = getRandomUserAgent(userAgents);
    console.log('Using user agent:', userAgent);

    try {
      browser = await puppeteer.launch({
      headless: config.headless,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });


      const page = await browser.newPage();
      await page.setUserAgent(userAgent);

      // Set a random viewport size
      const viewportWidth = 1920;
      const viewportHeight = 1080;
      await page.setViewport({ width: viewportWidth, height: viewportHeight });

      console.log('Navigating to the main page');
      await page.goto(`${pageUrl}`);

      const emailInputSelector = 'input[placeholder="Work Email"]';
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
      if (currentUrl.startsWith('https://uizard.io/autodesigner/dashboard/')) {
        console.log('Redirected to the dashboard:', currentUrl);
        
      } else {
        console.log('Did not redirect to the dashboard, trying again');
        await page.close();
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      if (browser) {
        console.log(`Waiting for ${config.delay} ms before starting the next iteration.`);
        await delay(config.delay);
        await browser.close();
      }
    }
  }
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  await run();
})();