

## Delete Test Student from NAKSCO

### What I Found

- **Student to delete**: "MRx Mail" (ID: `038eaccd-da4f-4334-b69f-e3d7e55608f5`)
  - This student has `class_level: basic6` but no actual "Basic 6" class exists in NAKSCO
  - It appears to be a test/orphaned record

- **Classes in NAKSCO**: Only Basic 7, Basic 8, and Basic 9 exist - there is no Basic 6 class to delete

### What I'll Do

1. **Delete the test student "MRx Mail"** from the students table
2. After deletion, NAKSCO will correctly show **33 students** (all in Basic 7)

### Technical Details

- Execute a DELETE query on the `students` table for the student ID
- No class deletion needed since Basic 6 doesn't exist as a class record
- The student count will automatically update when you refresh the dashboard

