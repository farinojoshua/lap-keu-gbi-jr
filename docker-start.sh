#!/bin/sh

# Run database migrations
npx prisma migrate deploy

# Seed default admin if database is fresh (no users yet)
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.user.count();
  if (count === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { username: 'admin', password: hash, name: 'Administrator', role: 'admin' }
    });
    console.log('Default admin user created');
  }
  await prisma.\$disconnect();
})();
"

# Start the app
node server.js
