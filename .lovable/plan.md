## Goal
Fix Score Entry so saving marks is idempotent, immediately visible, and never causes duplicate-key conflicts during normal teacher/admin use.

## Findings
- The grid builds rows from context state using `students.length` and `existingScores.length` as effect dependencies.
- After the first insert, the score can exist in the database but the local row may still have an empty `id`, so a second Save attempts another insert and hits the unique constraint: `scores_student_id_class_level_subject_key`.
- `scores` currently does not include `academic_year` or `term` in the generated type/schema shown in code, even though reports use term/year elsewhere. I will confirm live schema availability during implementation and avoid unsafe schema assumptions.

## Implementation Plan
1. **Make score saving idempotent**
   - Replace insert-vs-update looping with a safe upsert path for each entered score.
   - Conflict target will match the existing unique constraint: `student_id,class_level,subject`.
   - Include `school_id` from the selected school in every saved score.
   - Return the saved records from the backend so local state receives real database IDs immediately.

2. **Refresh the grid immediately after save**
   - Update `SchoolContext` with a dedicated `upsertScore` method, or update `addScore` to use upsert semantics safely.
   - After save confirmation, refresh data and update Score Entry rows from the returned records so fields remain visible without requiring a page reload.
   - Fix Score Entry row initialization dependencies so it reacts to actual student/score changes, not only array lengths.

3. **Correct retrieval and matching filters**
   - Ensure score fetches and local filters include: selected school, class, subject, and student.
   - If the live `scores` table has `academic_year` and `term`, include those in save and retrieval filters.
   - If those columns do not exist, keep the fix aligned with the current unique constraint and existing reports without adding risky schema changes unless needed.

4. **Improve error handling and success timing**
   - Only show “Scores Saved” after every backend write succeeds and the grid state is updated/refreshed.
   - Show clear failure messages for duplicate conflicts or backend errors instead of misleading success messages.
   - Keep the existing saving spinner/disabled state to prevent double-click saves.

5. **Validation**
   - Test the workflow in the running app: save a new mark, confirm it appears immediately, edit it, save again, and confirm no duplicate record or 409 conflict occurs.
   - Use database reads where available to verify the saved record exists after first save and has been updated after editing.

## Expected Result
Teachers/admins can save new marks, see them immediately in the Score Entry grid, edit and save the same marks repeatedly, and avoid duplicate-key conflicts in normal use.