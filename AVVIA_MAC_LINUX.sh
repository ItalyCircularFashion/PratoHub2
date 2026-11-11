#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Installa Node.js: https://nodejs.org/"; exit 1; fi
if [ ! -d node_modules ]; then npm install; fi
npm run dev
