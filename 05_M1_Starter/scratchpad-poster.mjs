import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const b64 = readFileSync('assets/tydny/kojeni-2026/nit-obrat.mp4').toString('base64');
const dataUrl = await page.evaluate(async (vb64) => {
  const video = document.createElement('video');
  video.src = 'data:video/mp4;base64,' + vb64;
  video.muted = true;
  await new Promise((res, rej) => { video.onloadeddata = res; video.onerror = rej; });
  video.currentTime = 0.04;
  await new Promise(res => { video.onseeked = res; });
  const c = document.createElement('canvas');
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}, b64);
writeFileSync('assets/tydny/kojeni-2026/nit-obrat-poster.jpg',
  Buffer.from(dataUrl.split(',')[1], 'base64'));
await browser.close();
console.log('poster ok');
