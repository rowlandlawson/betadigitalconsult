# Backend SQL Query Fix - Profit/Loss Report

## Issue Fixed
**Error:** `column reference "total_cost" is ambiguous`  
**Location:** `reportsController.js` - `getProfitLossStatement()` method

## Root Cause
In the `expenseBreakdownQuery` UNION statement, columns were referenced without table aliases:
- `material_name` → `mu.material_name`
- `type` → `we.type`
- `description` → `we.description` (ambiguous between waste_expenses and materials_used)
- `total_cost` → `mu.total_cost` and `we.total_cost` (ambiguous)
- `created_at` → `mu.created_at` and `we.created_at` (ambiguous)
- `category` → `oe.category`

PostgreSQL couldn't determine which table to pull these columns from.

## Solution Applied
Added explicit table aliases to all column references in the UNION query:

| Table | Alias |
|-------|-------|
| materials_used | mu |
| waste_expenses | we |
| operational_expenses | oe |
| jobs | j |

## Changes Made
```sql
-- BEFORE (Ambiguous)
SELECT 
  'Materials' as category,
  material_name as description,        -- ❌ Ambiguous
  total_cost as amount,                -- ❌ Ambiguous
  created_at as date                   -- ❌ Ambiguous
FROM materials_used mu

-- AFTER (Qualified)
SELECT 
  'Materials' as category,
  mu.material_name as description,     -- ✅ Qualified
  mu.total_cost as amount,             -- ✅ Qualified
  mu.created_at as date                -- ✅ Qualified
FROM materials_used mu
```

Same fixes applied to `waste_expenses` (we.*) and `operational_expenses` (oe.*) subqueries.

## File Modified
- `print-press-backend/src/controllers/reportsController.js` (lines 514-545)

## How to Test
```bash
# Backend should now handle profit/loss report requests without SQL errors
# The /api/reports/profit-loss endpoint will now:
# ✅ Query revenue breakdown
# ✅ Query expense breakdown (materials, waste, operational)
# ✅ Calculate labor costs
# ✅ Return complete P&L statement
```

## Related Endpoints
- `GET /api/reports/profit-loss?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

## Status
✅ **Fixed** - SQL query now properly qualified with table aliases
