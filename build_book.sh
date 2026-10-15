#!/usr/bin/env bash

set -euo pipefail

BOOK_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NVM_SCRIPT="/home/y/.nvm/nvm.sh"

cd "$BOOK_DIR"

if [[ ! -s "$NVM_SCRIPT" ]]; then
  echo "错误：找不到 NVM：$NVM_SCRIPT" >&2
  exit 1
fi

source "$NVM_SCRIPT"
nvm use 10.24.1

gitbook build . docs
touch docs/.nojekyll

echo "构建完成：$BOOK_DIR/docs/index.html"
