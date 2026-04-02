#!/bin/bash
# Guard: Ensure --accept-data-loss is never reintroduced
if grep -rn "accept-data-loss" . --include="*.json" --include="*.ts" --include="*.js" --include="*.sh" --include="*.yml" --include="*.yaml" --include="Dockerfile" --include="Makefile" | grep -v "node_modules" | grep -v ".git" | grep -v "check-no-data-loss"; then
  echo "ERROR: --accept-data-loss found in codebase. This flag is banned in production."
  echo "Use 'prisma migrate deploy' for production and 'prisma db push' for local dev only."
  exit 1
fi
echo "OK: No --accept-data-loss flags found."
