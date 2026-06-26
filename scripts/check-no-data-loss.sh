#!/bin/bash
# Guard: Ensure --accept-data-loss is never reintroduced.
#
# Scope: prisma command surfaces only (scripts, config, CI). The changelog data
# files (changelog.json / changelog-data.ts) are generated content that
# legitimately *describes* the historical removal of this flag as prose — they
# are never executed, so a match there is a false positive. Excluding them keeps
# the guard honest (a guard that cries wolf gets disabled) without weakening its
# real coverage.
if grep -rn "accept-data-loss" . --include="*.json" --include="*.ts" --include="*.js" --include="*.sh" --include="*.yml" --include="*.yaml" --include="Dockerfile" --include="Makefile" --exclude="changelog.json" --exclude="changelog-data.ts" | grep -v "node_modules" | grep -v ".git" | grep -v "check-no-data-loss"; then
  echo "ERROR: --accept-data-loss found in codebase. This flag is banned in production."
  echo "Use 'prisma migrate deploy' for production and 'prisma db push' for local dev only."
  exit 1
fi
echo "OK: No --accept-data-loss flags found."
