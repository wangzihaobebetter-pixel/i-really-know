// verify-mobile.cjs — 用 puppeteer-core + 系统 Chrome 做真实移动端布局验证
// 解决 headless --screenshot 没有 device metrics 导致的"假溢出"假象
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.env.IRK_URL || 'http://localhost:4174/'

let failed = 0
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`)
  if (!ok) failed++
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  })

  // ---- 移动端：390x844 (iPhone 12/13/14 逻辑分辨率) ----
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 800))

  const mobile = await page.evaluate(() => {
    const doc = document.documentElement
    const rect = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, width: b.width, height: b.height, left: b.left, right: b.right, top: b.top, bottom: b.bottom }
    }
    return {
      innerWidth: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      heroRect: rect('.hero'),
      cardRect: rect('.card'),
      rowRect: rect('.row'),
      taRect: rect('textarea'),
      tabbarRect: rect('.tabbar')
    }
  })

  console.log('--- 移动端 390px ---')
  console.log(JSON.stringify(mobile, null, 1))
  check('移动端无横向溢出 (scrollWidth <= innerWidth)', mobile.scrollWidth <= mobile.innerWidth,
    `scroll=${mobile.scrollWidth} inner=${mobile.innerWidth}`)
  check('卡片宽度 <= 视口', !mobile.cardRect || mobile.cardRect.width <= mobile.innerWidth - 8,
    `card=${mobile.cardRect?.width.toFixed(0)}`)
  check('textarea 宽度 <= 视口', !mobile.taRect || mobile.taRect.width <= mobile.innerWidth - 8,
    `ta=${mobile.taRect?.width.toFixed(0)}`)
  check('题数/难度行不溢出', !mobile.rowRect || mobile.rowRect.width <= mobile.innerWidth - 8,
    `row=${mobile.rowRect?.width.toFixed(0)}`)
  check('底部导航在视口内', !mobile.tabbarRect || (mobile.tabbarRect.left >= -1 && mobile.tabbarRect.right <= mobile.innerWidth + 1))

  await page.screenshot({ path: '/tmp/irk-real-mobile.png' })

  // ---- 桌面端：1280x900 ----
  const page2 = await browser.newPage()
  await page2.setViewport({ width: 1280, height: 900 })
  await page2.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 800))
  const desktop = await page2.evaluate(() => {
    const doc = document.documentElement
    const rect = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { width: b.width, left: b.left, right: b.right }
    }
    return {
      innerWidth: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      contentRect: rect('.content'),
      cardRect: rect('.card'),
      tabbarRect: rect('.tabbar')
    }
  })
  console.log('--- 桌面端 1280px ---')
  console.log(JSON.stringify(desktop, null, 1))
  check('桌面端无横向溢出', desktop.scrollWidth <= desktop.innerWidth)
  check('桌面内容区居中且有限宽', !desktop.contentRect || desktop.contentRect.width <= 760,
    `content=${desktop.contentRect?.width.toFixed(0)}`)

  await page2.screenshot({ path: '/tmp/irk-real-desktop.png' })
  await browser.close()

  console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('脚本错误：', e)
  process.exit(1)
})
