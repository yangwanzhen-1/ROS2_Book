#!/usr/bin/env bash

# 任意命令失败时立即退出；未定义变量和管道错误也视为失败。
set -euo pipefail

# 获取脚本所在目录，确保从其他目录执行时也能正确找到书籍项目。
BOOK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NVM_SCRIPT="/home/y/.nvm/nvm.sh"

# 进入 ROS2_Book 项目根目录。
cd "$BOOK_DIR"

# GitBook 3.2.3 需要通过 NVM 使用兼容的旧版 Node.js。
if [[ ! -s "$NVM_SCRIPT" ]]; then
  echo "错误：找不到 NVM：$NVM_SCRIPT" >&2
  exit 1
fi

# 加载 NVM 并切换到 Node.js 10.24.1。
source "$NVM_SCRIPT"
nvm use 10.24.1

# 根据 SUMMARY.md 中的 AUTO_TOC 标记，自动生成可折叠的侧边标题目录。
node scripts/generate_sidebar_toc.js

# 将 src/ 中的 Markdown、图片和插件构建到 docs/，供 GitHub Pages 发布。
gitbook build . docs

# 禁止 GitHub Pages 使用 Jekyll 再次处理已经生成的静态网页。
touch docs/.nojekyll

# 输出本地首页位置。
echo "构建完成：$BOOK_DIR/docs/index.html"
