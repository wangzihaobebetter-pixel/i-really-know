#!/bin/bash
# 我真会 · I Really Know — 双击启动（Mac）
cd "$(dirname "$0")"
if ! command -v npx >/dev/null 2>&1; then
  echo "没找到 Node.js，请先安装：https://nodejs.org"
  read -n 1 -s -r -p "按任意键退出"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "首次运行：安装依赖中…"
  npm install --no-audit --no-fund
fi
echo "我真会 · I Really Know"
echo "正在启动… 启动后浏览器会自动打开 http://localhost:4174"
echo "手机装 App 版：同一 Wi-Fi 下打开下方 Network 地址，用浏览器菜单「添加到主屏幕」"
echo "按 Ctrl+C 停止。"
npx vite preview --port 4174 --host &
SERVER_PID=$!
sleep 2
open "http://localhost:4174" 2>/dev/null
wait $SERVER_PID
