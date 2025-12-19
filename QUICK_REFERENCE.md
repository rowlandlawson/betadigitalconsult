# 📋 Quick Reference - Commands & Configs

## 🚀 One-Time Setup (Already Done)

### Frontend Isolation
```bash
# ✅ Created: print-press-front-end/.npmrc
node-linker=hoisted
shamefully-hoist=true
strict-peer-dependencies=false
workspace-root=.
node-modules=true
```

### Backend Isolation  
```bash
# ✅ Created: print-press-backend/.npmrc
node-linker=hoisted
shamefully-hoist=true
strict-peer-dependencies=false
workspace-root=.
node-modules=true
```

### Next.js Turbopack
```typescript
// ✅ Updated: print-press-front-end/next.config.ts
turbopack: {
  root: process.cwd(),
}
```

### SQL Query Fix
```javascript
// ✅ Fixed: print-press-backend/src/controllers/reportsController.js
// Changed unqualified columns to qualified aliases:
// material_name → mu.material_name
// total_cost → mu.total_cost / we.total_cost
// created_at → mu.created_at / we.created_at
```

---

## 💻 Daily Commands

### Start Frontend
```bash
cd print-press-front-end
pnpm dev
# → http://localhost:3000
```

### Start Backend
```bash
cd print-press-backend
pnpm dev
# → http://localhost:5000
```

### Install New Package (Frontend)
```bash
cd print-press-front-end
pnpm add <package-name>
```

### Install New Package (Backend)
```bash
cd print-press-backend
pnpm add <package-name>
```

---

## 🔍 Verification Commands

### Check Packages
```bash
# Frontend
cd print-press-front-end
pnpm list @radix-ui/react-select immer
# Expected: Both should show their versions (2.2.6 and 11.0.1)

# Backend
cd print-press-backend
pnpm list
```

### Test Backend API
```bash
# Profit/Loss Report (tests the fixed SQL query)
curl "http://localhost:5000/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-12-31"
```

### Check pnpm Config
```bash
cd print-press-front-end
pnpm config get workspace-root  # Should output: .
pnpm config get node-linker      # Should output: hoisted
```

---

## 🆘 Emergency Reset

If things break, use this nuclear option:

### Frontend
```bash
cd print-press-front-end
rm -rf node_modules pnpm-lock.yaml .next
pnpm install
pnpm dev
```

### Backend
```bash
cd print-press-backend
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

---

## 📦 Installed Packages (Critical)

### Frontend
- ✅ `@radix-ui/react-select@2.2.6`
- ✅ `immer@11.0.1`
- ✅ `next@16.0.10`
- ✅ `recharts@3.6.0`
- ✅ `react@19.2.0`
- ✅ `typescript@5.7.2`

### Backend
- Node.js (Express)
- PostgreSQL (pg library)

---

## 🎯 What Each Fix Did

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Module not found: @radix-ui/react-select | pnpm workspace detection | `.npmrc` + Turbopack config |
| Cannot resolve 'immer' | Same as above | Same as above |
| Ambiguous column in SQL | Missing table aliases | Qualified all columns |

---

## 📌 Important Notes

### DO
- ✅ `cd` into project directory before running pnpm commands
- ✅ Keep `.npmrc` files in each project
- ✅ Run frontend and backend in separate terminal windows
- ✅ Clear node_modules if you change configuration files

### DON'T
- ❌ Run `pnpm install` from parent directory
- ❌ Remove `.npmrc` files
- ❌ Run `pnpm dev` from parent directory
- ❌ Use `npm` instead of `pnpm`

---

## 🟢 Status

```
FRONTEND
├─ Module Resolution     : ✅ FIXED
├─ @radix-ui/react-select: ✅ INSTALLED
├─ immer               : ✅ INSTALLED
├─ Dev Server          : ✅ RUNNING
└─ Dashboard           : ✅ RENDERING

BACKEND
├─ SQL Query           : ✅ FIXED
├─ Profit/Loss Report  : ✅ WORKING
├─ WebSocket Messages  : ✅ FLOWING
└─ API Endpoints       : ✅ RESPONDING
```

---

**Last Updated:** December 18, 2025
**Status:** ✅ READY FOR DEVELOPMENT
