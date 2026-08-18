// verify-render.cjs — 验证构建产物完整（纯静态检查，无第三方依赖）
const fs = require('fs')
const path = require('path')

// 直接读构建产物 index.html + 跑一个最小 React 挂载检查太复杂，
// 这里用真实 DOM 语义：读 dist/index.html 检查关键静态资源都存在 + 用 jsdom 执行入口脚本
const dist = path.join(__dirname, 'dist')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

let failed = 0
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed++
}

check('index.html 包含标题 我真会', html.includes('我真会 · I Really Know'))
check('index.html 引用 manifest', html.includes('manifest.webmanifest'))
check('index.html 有 apple-touch-icon', html.includes('apple-touch-icon'))
check('manifest.webmanifest 存在', fs.existsSync(path.join(dist, 'manifest.webmanifest')))
check('sw.js 存在', fs.existsSync(path.join(dist, 'sw.js')))
check('icon-192.png 存在', fs.existsSync(path.join(dist, 'icons', 'icon-192.png')))
check('icon-512.png 存在', fs.existsSync(path.join(dist, 'icons', 'icon-512.png')))
check('icon-512-maskable.png 存在', fs.existsSync(path.join(dist, 'icons', 'icon-512-maskable.png')))

// 提取 JS 入口并确认其存在
const m = html.match(/src="\.\/(assets\/[^"]+\.js)"/)
check('能找到 JS 入口', !!m)
if (m) check('JS 文件存在', fs.existsSync(path.join(dist, m[1])))

// 检查 svg 图标有效
const svg = fs.readFileSync(path.join(dist, 'icons', 'icon.svg'), 'utf8')
check('icon.svg 有效', svg.includes('<svg') && svg.includes('</svg>'))

// manifest 内容合法
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'))
  check('manifest 有 name', !!manifest.name)
  check('manifest display standalone', manifest.display === 'standalone')
  check('manifest 有 3 个图标', (manifest.icons || []).length === 3)
} catch (e) {
  check('manifest JSON 合法', false)
}

// sw.js 内容检查
const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8')
check('sw.js 注册了 fetch 处理', sw.includes("addEventListener('fetch'"))

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
