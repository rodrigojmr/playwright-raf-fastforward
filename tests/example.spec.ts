import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

declare let window: Window & { p: number[] };

test('raf should not hang and timeout test', async ({ page }) => {
  test.setTimeout(5000);

  await page.route('**', (request) => {
    if (request.request().resourceType() === 'document') {
      return request.fulfill({
        contentType: 'text/html',
        body: readFileSync(path.join(__dirname, '../index.html'), 'utf-8'),
      });
    }
    return request.fallback();
  });

  await page.clock.install();

  await page.goto('http://localhost:3000/');

  await page.evaluate(() => {
    window.p = [performance.now()];
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        console.log('raf1', window.p[0]);
        resolve();
      });
    });
  });

  await page.clock.fastForward(6000);

  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const b = performance.now();
      console.log('after fastfoward', b - window.p.at(-1));
      window.p.push(b);
      function onRaf() {
        const c = performance.now();
        console.log('raf', c - window.p.at(-1));
        window.p.push(c);
        console.log('performance now values', window.p);
        resolve();
        // it may be easier to reproduce if a second raf is queued
        // window.requestAnimationFrame(() => {
        //   const d = performance.now();
        //   console.log('raf2', d - window.p.at(-1));
        //   window.p.push(d);
        //   console.log('window.p: ', window.p);
        //   resolve();
        // });
      }
      window.requestAnimationFrame(onRaf);
    });
  });
});
