# Outstanding Payments Feature - Quick Reference

## What Was Added

**Outstanding Payments** section now displays on the admin Payments page showing:
- Total amount owed
- Number of unpaid jobs
- Customers with outstanding payments
- Aging breakdown (0-30 days, 31-60 days, etc.)
- Top 10 most overdue jobs (expandable)

## Files Created/Modified

### Backend
✅ `src/controllers/paymentController.js` - Added `getOutstandingPayments()` function
✅ `src/routes/payments.js` - Added `/outstanding` route

### Frontend
✅ `src/components/payments/outstanding-payments.tsx` - NEW component
✅ `src/app/admin/payments/page.tsx` - Updated to show outstanding section
✅ `src/types/payments.ts` - Added TypeScript interfaces

## How to Use

1. **Admin Dashboard** → Click "Payments"
2. **See Outstanding Payments section at top** showing:
   - 🔴 **Total Outstanding** amount
   - 🟠 **Outstanding Jobs** count
   - 🟣 **Customers Owed** count
3. **View Payment Aging** breakdown
4. **Click arrow** to expand top 10 unpaid jobs
5. **Click "View Job"** to see details and take action

## API Endpoint

```
GET /api/payments/outstanding
```

Returns: Summary, Detailed jobs, and Aging analysis

## Display Elements

| Card | Shows | Color |
|------|-------|-------|
| Total Outstanding | Amount owed | 🔴 Red |
| Outstanding Jobs | Count | 🟠 Orange |
| Customers Owed | Count | 🟣 Purple |

## Aging Categories

| Category | Days | Color |
|----------|------|-------|
| Current | 0-30 | 🔵 Blue |
| Overdue | 31-60 | 🟡 Yellow |
| Very Overdue | 61-90 | 🟠 Orange |
| Critical | 90+ | 🔴 Red |

## Key Features

✅ Real-time data from database
✅ Automatic aging calculation
✅ Customer contact info displayed
✅ Quick link to view job details
✅ Mobile responsive design
✅ Loading and error states

## Status

🟢 **COMPLETE AND READY TO USE**

---

**Need to test?** 
→ Go to `/admin/payments` in the application

**Need API data?**
→ Call `GET /api/payments/outstanding`
