---
name: studentos-change-checklist
description: Pre-flight and wrap-up checklist for any StudentOS change — syncing with origin, tracing a field from form to Supabase and back, hand-applied migrations, and iPad Safari (Apple Pencil, touch, clipboard, share) pitfalls. Use before editing StudentOS code and before reporting a StudentOS change as done.
---

# StudentOS change checklist

Each item below caused a real, user-visible bug. Check the ones your change touches.

## 1. Start from the latest code
Adam works from more than one machine. Local `main` has been found behind `origin/main`, with the feature being discussed only on the remote.
- Run `git fetch origin && git log --oneline main..origin/main` before editing.
- If you are behind and `main` has not diverged, fast-forward first. If you already have edits: `git stash -u`, then `git merge --ff-only origin/main`, then `git stash pop`.
- If something the user describes isn't in the code, check the remote before concluding it doesn't exist.

## 2. Trace every field end to end (the "it's gone after refresh" bug)
State is optimistic, so a field that never reaches Supabase looks fine until a reload. For each field a form collects, confirm all four links:
1. The form passes it to the App.jsx handler.
2. The handler's `insert` (create) **and** `update` (edit) payloads write it. Create and edit handlers drift apart, so share one field-mapping helper (e.g. `customEventFields` in App.jsx).
3. The load query's row mapper (`mapXRow` / `dbDomainToLocal` / the notes loader) reads it back.
4. Anything derived for display (domain code/colour on events) is resolved at render from ids, not stored on the object only at creation.

Past instances of this bug: calendar event time, duration, notes, and "Other" label; PDF note template; domain description, semester label, and role.

Also check:
- **Diff baselines must be seeded on load.** `handleSaveNote` diffs pages against `lastSavedStrokesRef`. Without seeding at load, deletions in a new session never reached the DB.
- **Debounced autosave must flush, never be cancelled.** Switching notes, unmounting, or the app going hidden must send the pending save (`flushPendingSave` in NotesPage).
- **Rollbacks restore the in-memory snapshot**, never a raw snake_case DB row.
- **Ordering columns:** new item position = max + 1, not count (count collides after a delete). Sort by `position` explicitly.

## 3. Migrations are pasted by hand
- New SQL goes in `student-os/supabase/migrations/2026_<name>.sql`. It must be idempotent (`if not exists`). Mirror it in `schema.sql`.
- Until it is run, PostgREST rejects the whole write and the UI only logs `console.error`. Send a new optional column only when it has a value, so unrelated writes keep working.
- Tell the user explicitly which migration to run in the Supabase SQL editor.

## 4. iPad Safari / Apple Pencil
- `user-select` needs the `-webkit-` prefix on iOS. Use the `.no-text-select` class in `index.css`; it keeps inputs editable. Plain inline `userSelect: 'none'` does nothing on iPad.
- Native pinch and double-tap zoom: set `touch-action: pan-x pan-y` on scroll areas around custom-gesture surfaces.
- The Pencil fires both pen pointer events and `touchType: 'stylus'` touch events. One path must own it (`stylusTouchSeen` in NoteCanvas).
- Finger gestures on a writing surface must ignore palms: any touch that starts while the Pencil is down, or within the grace window after it lifts. Require near-simultaneous landing for multi-finger taps, and a dead zone before pinching.
- `navigator.clipboard.read/write` and `navigator.share` need a live user gesture. Start the call synchronously in the tap handler (pass a Promise to `ClipboardItem`). After slow async work, fall back to a download if share throws `NotAllowedError`.
- SVG-as-image rasterising only renders inline `data:` URLs, so keep note images inline. Use explicit pixel sizes, not `100%`, for anything rasterised with a custom viewBox.
- Safari often paints an SVG's embedded `<image>` blank when the whole SVG is drawn to a canvas. Rasterise in layers instead (template, then each image drawn directly, then ink). See `rasterizeSvg` in NoteCanvas. Free each canvas after use (`width = 0`), because iOS caps total canvas memory.
- iOS frequently delivers simultaneous fingers in one `touchstart`, so never assume one finger is reported before the second. Multi-finger tap timing must start when `touches.length === changedTouches.length`.
- An `opacity: 0` popup can still be long-press selected. Use `visibility: hidden` for hidden UI over the page.

## 5. Verify
- No test runner exists. Run the lint diff against HEAD (the repo already has lint errors) and `npx vite build`.
- Pure helpers can be checked with `node --no-warnings --input-type=module -e "import ... from './src/...'"`.
- UI flows need a logged-in Supabase session. Say so when you couldn't exercise them.
