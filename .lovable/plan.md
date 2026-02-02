
## Plan: Fix Class Uniqueness Constraint for Multi-School Support

### Problem Identified
The `classes` table has a unique constraint `classes_name_key` that only checks the `name` column. This means "Basic 9" can only exist once across **all schools**, when it should be allowed once **per school**.

**Current constraint:**
```sql
UNIQUE (name)  -- Wrong: Global uniqueness
```

**Required constraint:**
```sql
UNIQUE (name, school_id)  -- Correct: Per-school uniqueness
```

### Solution
Run a database migration to:
1. Drop the existing `classes_name_key` constraint
2. Add a new composite unique constraint on `(name, school_id)`

### Database Migration
```sql
-- Drop the old global uniqueness constraint on class name
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_name_key;

-- Add new composite unique constraint for per-school uniqueness
ALTER TABLE public.classes ADD CONSTRAINT classes_name_school_unique UNIQUE (name, school_id);
```

### Impact
- **Before:** "Basic 9" in School A blocks "Basic 9" in School B
- **After:** Each school can have its own "Basic 9" independently

### Files Changed
- One new database migration file

### No Code Changes Needed
The frontend code in `ClassManagement.tsx` already correctly includes `school_id` when inserting classes (line 204). The error handling for duplicate entries (error code `23505`) will continue to work correctly, but now it will only trigger when trying to add a duplicate class within the **same school**.
