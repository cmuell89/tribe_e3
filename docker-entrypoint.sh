#!/bin/sh
set -e

# Ensure the data directory exists
mkdir -p /app/data

# Run database migrations
npx prisma migrate deploy

# Start the application
exec node server.js
