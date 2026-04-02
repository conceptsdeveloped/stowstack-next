# 01 — Kill `--accept-data-loss` in Production Build

## Severity: CATASTROPHIC
## Estimated Hours: 3-4

---

## Context

The current build script runs `prisma db push --accept-data-loss` during production deployment. This means any schema change — including accidental typos — can silently destroy customer data with zero rollback capability. This is the single most dangerous line in the entire codebase.

---

## Step 1: Locate the Offending Command

Search the entire codebase for every instance of `--accept-data-loss`:

```bash
grep -rn "accept-data-loss" . --include="*.json" --include="*.ts" --include="*.js" --include="*.sh" --include="*.yml" --include="*.yaml" --include="Dockerfile" --include="Makefile"
```

Also check:
- `package.json` (build, postbuild, predeploy, vercel-build scripts)
- `vercel.json` (buildCommand, installCommand)
- Any CI/CD config files (`.github/workflows/`, etc.)
- Any shell scripts in the repo root or `scripts/` directory

Record every file and line number where this flag appears.

---

## Step 2: Remove `--accept-data-loss` Everywhere

For every instance found in Step 1, remove the `--accept-data-loss` flag entirely. Do not just comment it out. Delete it.

---

## Step 3: Remove `prisma db push` from Production Build

`prisma db push` is a prototyping tool. It must not run in production builds.

Replace every production-context usage of `prisma db push` with `prisma migrate deploy`.

The build script in `package.json` should look like:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

If there is a Vercel-specific build command in `vercel.json` or Vercel dashboard settings, update it to match.

**Keep `prisma db push` available for local development only.** Add a dev-only script:

```json
{
  "scripts": {
    "db:push": "prisma db push",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy"
  }
}
```

---

## Step 4: Initialize Migration History

If the project has never used `prisma migrate`, you need to baseline it:

```bash
# Create initial migration from current schema without applying it
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

# Mark it as already applied (since the DB already matches the schema)
npx prisma migrate resolve --applied 0_init
```

If `prisma/migrations/` already exists with migration files, skip this step.

---

## Step 5: Create a Migration Workflow Guard

Create a new file `scripts/check-no-data-loss.sh`:

```bash
#!/bin/bash
# Guard: Ensure --accept-data-loss is never reintroduced
if grep -rn "accept-data-loss" . --include="*.json" --include="*.ts" --include="*.js" --include="*.sh" --include="*.yml" --include="*.yaml" --include="Dockerfile" --include="Makefile" | grep -v "node_modules" | grep -v ".git" | grep -v "check-no-data-loss"; then
  echo "ERROR: --accept-data-loss found in codebase. This flag is banned in production."
  echo "Use 'prisma migrate deploy' for production and 'prisma db push' for local dev only."
  exit 1
fi
echo "OK: No --accept-data-loss flags found."
```

Make it executable: `chmod +x scripts/check-no-data-loss.sh`

---

## Step 6: Add to CI/Pre-commit (if CI exists)

If `.github/workflows/` or any CI config exists, add the guard script as a step. If no CI exists, add it to `package.json`:

```json
{
  "scripts": {
    "lint:safety": "bash scripts/check-no-data-loss.sh"
  }
}
```

---

## Verification

Run these commands. ALL must pass:

```bash
# 1. No instances of --accept-data-loss anywhere
grep -rn "accept-data-loss" . --include="*.json" --include="*.ts" --include="*.js" --include="*.sh" --include="*.yml" --include="*.yaml" | grep -v node_modules | grep -v .git
# Expected: No output

# 2. Build script uses prisma migrate deploy
grep -n "prisma migrate deploy" package.json
# Expected: At least one match in the build script

# 3. prisma db push is NOT in any production/build script
grep -n "db push" package.json | grep -E "(build|deploy|vercel|post)"
# Expected: No output

# 4. Guard script exists and is executable
test -x scripts/check-no-data-loss.sh && echo "OK" || echo "FAIL"
# Expected: OK

# 5. Guard script passes
bash scripts/check-no-data-loss.sh
# Expected: "OK: No --accept-data-loss flags found."
```

---

## Commit

```
fix: 01 remove --accept-data-loss, switch to prisma migrate deploy

BREAKING: Production builds now use prisma migrate deploy instead of
prisma db push. All schema changes must go through migration files.
This prevents silent data loss on deployment.
```
