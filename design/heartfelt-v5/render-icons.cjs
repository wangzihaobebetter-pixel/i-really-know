const puppeteer = require('puppeteer-core');
const { join } = require('node:path');
const { readFileSync } = require('node:fs');
const iconDir = join(__dirname, '..', '..', 'public', 'icons');

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
  const svg = readFileSync(join(iconDir, 'icon.svg'), 'utf8');
  try {
    for (const size of [192, 512]) {
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#F6F3EA}svg{display:block;width:100%;height:100%}</style>${svg}`);
      await page.screenshot({ path: join(iconDir, `icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } });
      await page.close();
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
    await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#F6F3EA}svg{display:block;width:100%;height:100%;transform:scale(.78);transform-origin:center}</style>${svg}`);
    await page.screenshot({ path: join(iconDir, 'icon-512-maskable.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });
    await page.close();
    console.log('render-icons: 192, 512, maskable ✓');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
