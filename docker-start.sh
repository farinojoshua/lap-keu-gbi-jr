#!/bin/sh
set -e

echo "=== Running database migrations ==="
node ./node_modules/prisma/build/index.js migrate deploy

echo "=== Running seed script ==="
node ./docker-seed.js

echo "=== Starting application ==="
node server.js
