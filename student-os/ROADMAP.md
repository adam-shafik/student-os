# StudentOS — Planned Features

## In Progress / Done This Session
- [x] Grade tracker (Assessments tab — actual grades, predicted grades, projected avg, "what do I need?" calculator)
- [x] Tutorial steps for Assessments tab + grade tracker
- [x] Tutorial themes step navigates to Settings and spotlights theme picker
- [x] Smooth spotlight transition between tutorial steps

---

## To Build

### ~~1. Weekly Calendar View~~ ✅
Toggle on CalendarPage between monthly grid and a weekly view with time slots.
More actionable for day-to-day planning.

### 2. Study Stats
On the Study page — total hours this week, breakdown by domain (bar chart), study streak counter.
All data already exists in `study_sessions`.

### 3. Settings Page (complete it)
Currently has profile edit, theme switcher, and wallpaper toggle. Still needs:
- Semester reconfiguration (edit sem start/end + breaks)
- Data export

### 4. Notifications / Reminders
Push notifications + email for upcoming exams and assignment deadlines.
Service worker already exists. Needs:
- Notification permission prompt
- Per-assessment reminder preferences
- Email integration (Supabase edge function or similar)
