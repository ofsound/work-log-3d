# Fix: Notes trailing space with active timer

## Approach (minimal)

Stop normalizing **draft** session notes with `.trim()` on the path from the Time Box editor to `timerState.draftNotes` and back. Preserve the exact string while typing; existing validation for **saving** a time box can stay as-is.

## Code changes

1. **[`app/composables/useTimeBoxEditorModel.ts`](app/composables/useTimeBoxEditorModel.ts)**  
   In the debounced `setDraftContext` call, pass `dynamicNotes.value` (or equivalent) for `draftNotes` instead of `dynamicNotes.value.trim()`.

2. **[`shared/worklog/active-timer.ts`](shared/worklog/active-timer.ts)**  
   In `applyActiveTimerDraft`, set `draftNotes` from the draft without `normalizeOptionalString` (e.g. `draft.draftNotes === undefined ? state.draftNotes : (draft.draftNotes ?? '')`), so in-progress trailing spaces are not stripped on merge.

3. **Tests**
   - Update expectations in [`tests/timer.spec.ts`](tests/timer.spec.ts) and any other tests that assert trimmed `draftNotes` after apply/revive if those tests covered the old draft-sync behavior.
   - Add or extend a test (e.g. in [`tests/timebox-editor-model.spec.ts`](tests/timebox-editor-model.spec.ts) with a non-idle timer mock) that: type notes with a trailing space, advance timers past the debounce, assert `dynamicNotes` still ends with a space.

4. **Verify**  
   Run `npm run verify` after touching `app/`, `shared/`, and tests per project rules.

## Out of scope

- `reviveActiveTimerState` / Firestore read path may still trim for stored documents; that only affects rehydration from the server, not the live typing loop.
- Do not change time box **save** validation unless a separate requirement appears.
