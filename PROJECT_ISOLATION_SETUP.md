# Project Isolation & Module Resolution Fix

## Problem Summary
- pnpm detected multiple lockfiles and treated the parent folder as a monorepo workspace
- This caused module resolution to fail for `@radix-ui/react-select` and `immer`
- Turbopack root inference was incorrect

## Solution Applied

### 1. **Created `.npmrc` files in both projects**

Each project now has a dedicated `.npmrc` file that:
- Disables workspace detection (`workspace-root=.`)
- Uses hoisted node_modules structure (`node-linker=hoisted`, `shamefully-hoist=true`)
- Relaxes peer dependency restrictions
- Explicitly sets node-modules strategy

### 2. **Updated Next.js Turbopack configuration**

Added explicit `turbopack.root` setting in `next.config.ts` to prevent root inference errors.

## Commands to Run - Complete Setup

### Step 1: Clean everything (in print-press-front-end/)
```bash
cd C:\Users\Administrator\Documents\ROWLAND\betadigitalconsult\print-press-front-end
rm -rf node_modules pnpm-lock.yaml .next
```

### Step 2: Fresh install with isolation
```bash
pnpm install
```

### Step 3: Verify packages are installed
```bash
pnpm list @radix-ui/react-select immer
```

### Step 4: Start dev server
```bash
pnpm dev
```

## Do the same for backend (optional, but recommended)

### Backend cleanup and setup:
```bash
cd C:\Users\Administrator\Documents\ROWLAND\betadigitalconsult\print-press-backend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Files Created/Modified

### Created:
- `print-press-front-end/.npmrc`
- `print-press-backend/.npmrc`

### Modified:
- `print-press-front-end/next.config.ts` (added turbopack.root)

## Key Configuration Explanations

| Config | Purpose |
|--------|---------|
| `workspace-root=.` | Prevents pnpm from looking up the directory tree for workspace |
| `node-linker=hoisted` | Flattens node_modules for better compatibility |
| `shamefully-hoist=true` | Hoists all dependencies to root node_modules |
| `strict-peer-dependencies=false` | Allows packages with loose peer deps to install |
| `turbopack.root=process.cwd()` | Ensures Turbopack uses current project as root |

## Verification Checklist

After running the commands above:
- [ ] `node_modules/@radix-ui/react-select` exists
- [ ] `node_modules/immer` exists
- [ ] `pnpm list @radix-ui/react-select` shows version 2.2.6
- [ ] Dev server starts without module resolution errors
- [ ] Dashboard page loads without "Can't resolve" errors

## Troubleshooting

If you still get module errors:

### Option A: Nuclear reset
```bash
rm -rf node_modules pnpm-lock.yaml .pnpm-store
pnpm install --force
pnpm dev
```

### Option B: Check pnpm config
```bash
pnpm config get workspace-root
pnpm config get node-linker
```

Should output:
- `workspace-root: .`
- `node-linker: hoisted`

### Option C: Verify Next.js/Turbopack isn't lying
```bash
node -e "console.log(require('./next.config.ts').default.turbopack?.root || 'not set')"
```

## Future Prevention

When adding new packages to either project:
```bash
# For frontend
cd print-press-front-end
pnpm add <package-name>

# For backend
cd print-press-backend
pnpm add <package-name>

# NEVER run from parent directory
```

Always `cd` into the specific project directory before running pnpm commands.
