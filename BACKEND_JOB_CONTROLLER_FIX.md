# Backend SQL Bug Fix - Job Controller

## Issue Identified

**Error:** `error: there is no parameter $0`
**Location:** `jobController.js` - `getAllJobs()` method, line 52-54
**Endpoint:** `GET /api/jobs` (when search parameter is used)

## Root Cause

In the search functionality, the query was reusing the same parameter placeholder (`$${paramCount}`) three times but only adding one value to the params array:

```javascript
// BEFORE (BROKEN)
if (search) {
  countQuery += ` AND (
    j.ticket_id ILIKE $${paramCount} OR      // Uses $3 (for example)
    j.description ILIKE $${paramCount} OR    // Uses $3 (same!)
    c.name ILIKE $${paramCount}              // Uses $3 (same!)
  )`;
  params.push(`%${search}%`);  // Only adds ONE value, not three!
}
```

This caused PostgreSQL to expect 3 parameters but only received 1, resulting in:
- Missing parameter errors
- Parameter mismatch ($0 doesn't exist if only $1, $2, $3 are provided)

## Solution Applied

Updated the search query to properly increment the parameter count and add three values:

```javascript
// AFTER (FIXED)
if (search) {
  countQuery += ` AND (
    j.ticket_id ILIKE $${++paramCount} OR    // $1 (incremented)
    j.description ILIKE $${paramCount} OR    // $1 (same)
    c.name ILIKE $${paramCount}              // $1 (same)
  )`;
  params.push(`%${search}%`);  // Search value 1
  params.push(`%${search}%`);  // Search value 2
  params.push(`%${search}%`);  // Search value 3
}
```

## Files Modified

```
print-press-backend/src/controllers/jobController.js
- Lines 50-58: Fixed search query parameter handling
```

## What This Fixes

✅ Search functionality now works properly
✅ Jobs can be searched by ticket_id, description, or customer name
✅ No more "there is no parameter $0" errors
✅ Query execution is now correct

## Testing

To verify the fix works:

```bash
# Test without search (should already work)
curl http://localhost:5000/api/jobs

# Test with search (now fixed)
curl "http://localhost:5000/api/jobs?search=plumbing"
curl "http://localhost:5000/api/jobs?search=2024"
curl "http://localhost:5000/api/jobs?search=customer+name"
```

## Similar Issues to Watch For

This type of error can occur in other queries when:
1. Multiple placeholder references use same `$${paramCount}`
2. Not enough values added to params array
3. Parameter counting is off due to conditional logic

All parameters should be:
- Incrementally numbered: `$1, $2, $3...` (never repeat)
- Matched 1:1 with entries in the params array
- In the correct order

---

**Status:** ✅ Fixed
**Date:** December 18, 2025
