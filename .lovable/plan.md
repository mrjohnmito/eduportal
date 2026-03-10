

## Fix: Quick Actions Disappearing on Refresh & Photo Fitting

### Root Cause Analysis

**Quick Actions disappearing**: Confirmed. The race condition exists in `SchoolContext.tsx`. On page refresh:
1. `loading` starts as `true`, `isAdmin` starts as `false`
2. `fetchData()` runs and sets `loading = false` when done
3. But `isAdmin` is set in a **separate async call** (`checkAdminRole` or `checkSchoolAdminSession`) that may resolve **after** `loading` becomes `false`
4. QuickActions renders with `isAdmin = false` and `isTeacher = false` → shows nothing
5. When `isAdmin` finally resolves to `true`, it re-renders — but if navigation already redirected, it's too late

**Student photos in PDF**: The `fitImage` helper was added in the previous edit and looks correct. However, `getImageDimensions` relies on `Image.onload` which may silently fail for some image URLs (CORS, network issues), causing fallback to stretched rendering. Need to add error handling and a timeout.

### Changes

**1. Fix race condition in `src/contexts/SchoolContext.tsx`**
- Don't set `loading = false` until both data fetch AND admin role check are complete
- Add an `adminLoading` state that tracks whether the admin check has resolved
- Expose a combined `loading` that's `true` until both are done

**2. Fix Dashboard to show loading state properly (`src/pages/Dashboard.tsx`)**
- Show a loading spinner/skeleton while `loading` is true instead of rendering empty content

**3. Fix QuickActions to respect loading state (`src/components/dashboard/QuickActions.tsx`)**
- Accept `loading` from SchoolContext and show skeleton while loading

**4. Harden `getImageDimensions` in `src/pages/BulkPDF.tsx`**
- Add error handler and timeout (3s) to prevent hanging on broken images
- Return default dimensions on failure so `fitImage` still works

### Files to edit

| File | Change |
|---|---|
| `src/contexts/SchoolContext.tsx` | Merge admin role check into loading state |
| `src/pages/Dashboard.tsx` | Show loading skeleton while context is loading |
| `src/components/dashboard/QuickActions.tsx` | Check loading state before rendering |
| `src/pages/BulkPDF.tsx` | Add error handling + timeout to `getImageDimensions` |

