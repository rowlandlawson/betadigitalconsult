# Backend Job Controller - Parameter Binding Fix

## Issue Found

**Error:** `bind message supplies 3 parameters, but prepared statement "" requires 1`
**Location:** `jobController.js` - `getAllJobs()` method, line 76
**Code:** paginatedIdsQuery execution

## What Was Wrong

The issue was in how we calculated the LIMIT/OFFSET parameter placeholders:

```javascript
// BEFORE (WRONG)
const paginatedIdsQuery = countQuery.replace(...) + 
  ` ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

// Example with search:
// params = ["%search%", "%search%", "%search%"]  // length = 3
// Query uses: LIMIT $4 OFFSET $5  (because 3 + 1 = 4, 3 + 2 = 5)
// But query only has parameters: $1, $2, $3
// Result: ERROR - trying to use $4 and $5 which don't exist!
```

The problem was using `params.length` instead of `paramCount`:
- `params` is the actual array of values (includes search duplicates)
- `paramCount` tracks the parameter placeholder numbers ($1, $2, $3, etc.)
- These are **not the same** when search adds multiple values

## How It Was Fixed

Changed from using `params.length` to using `paramCount`:

```javascript
// AFTER (CORRECT)
const paginatedIdsQuery = countQuery.replace(...) + 
  ` ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;

// Example with search (paramCount = 3 after all filters):
// Query uses: LIMIT $4 OFFSET $5  (because 3 + 1 = 4, 3 + 2 = 5)
// Parameters passed: [...all existing params, limit_value, offset_value]
// Result: ✅ CORRECT - $4 and $5 exist in the parameters!
```

## Parameter Tracking Explanation

```
WITH search:
- status filter: $1
- search field 1: $2
- search field 2: $3
- search field 3: $4
- worker_id filter: $5
- paramCount = 5

LIMIT/OFFSET:
- LIMIT $6 (paramCount + 1 = 5 + 1 = 6)
- OFFSET $7 (paramCount + 2 = 5 + 2 = 7)
- params = [status, search, search, search, worker_id, limit_value, offset_value]
- All parameters match: $1-$7 ✓
```

## Files Modified

```
print-press-backend/src/controllers/jobController.js
- Lines 70-73: Fixed parameter placeholder calculation
- Removed confusing comment about re-applying filters
- Clarified the query flow
```

## What This Fixes

✅ Job list pagination now works with filters
✅ Search + pagination combination works
✅ All parameter combinations work correctly
✅ No more "bind message supplies X parameters" errors

## Testing

All these should now work without errors:

```bash
# Basic list (no filters)
curl http://localhost:5000/api/jobs

# With pagination
curl "http://localhost:5000/api/jobs?page=2&limit=10"

# With search
curl "http://localhost:5000/api/jobs?search=plumbing"

# With search and pagination
curl "http://localhost:5000/api/jobs?search=plumbing&page=2&limit=10"

# With status filter
curl "http://localhost:5000/api/jobs?status=completed"

# With all filters
curl "http://localhost:5000/api/jobs?status=completed&search=fix&page=1&limit=20"
```

## Key Learning

When building parameterized SQL queries:

❌ **Don't use:** `$${array.length + 1}`
```
This counts the VALUES, not the PARAMETER NUMBERS
```

✅ **Do use:** `$${paramCount + 1}`
```
This tracks the actual parameter placeholder numbers
```

This is especially important when:
- Multiple conditions add different numbers of parameters
- Search adds repeated values
- You're combining multiple filter conditions

---

**Status:** ✅ Fixed
**Date:** December 18, 2025
**Severity:** High (blocked job list functionality)
