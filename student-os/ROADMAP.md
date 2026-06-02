# StudentOS — Planned Features

## Done
- [x] Grade tracker (Assessments tab — actual grades, predicted grades, projected avg, "what do I need?" calculator)
- [x] Tutorial steps for Assessments tab + grade tracker
- [x] Tutorial themes step navigates to Settings and spotlights theme picker
- [x] Smooth spotlight transition between tutorial steps
- [x] Weekly Calendar View — toggle between monthly grid and time-slot weekly view
- [x] Settings Page — profile, password, semester reconfiguration, appearance, data export
- [x] Notifications / Reminders — push + email for exams and assignment deadlines

---

## To Build

### 1. Study Stats
On the Study page — total hours this week, breakdown by domain (bar chart), study streak counter.
All data already exists in `study_sessions`.

### ~~2. Auth Improvements~~ ✅
- Google OAuth (already done)
- Email verification on sign-up (Supabase + Resend custom SMTP)

### ~~3. Onboarding Redesign~~ ✅
- 3 steps (profile, semester, modules), schedule grid moved to Settings
- Dynamic "Hi, {name}" heading on step 1
- Tutorial updated: forward-looking copy, schedule-settings step, scroll/highlight fixed
- All em dashes removed from UI text

### 4. Auth + Onboarding UI Revamp
Full visual redesign of sign-in, sign-up, and onboarding screens.
- Framer Motion for step transitions and field animations
- Full-bleed background photo (dark study/library aesthetic)
- Glassmorphism card on auth page
- Split-panel layout on onboarding (brand left, form right)

### 4. Monetization — Freemium
Free tier with generous limits, Pro unlocks advanced features.
See monetization notes below.

---

## Monetization Strategy

### Free Tier
- Up to 5 domains
- Up to 30 notes (handwritten + typed combined)
- Default theme only
- No email/push reminders
- Calendar + todos + study timer: unlimited

### Pro Tier (~$3–5/month or $25/year for students)
- Unlimited domains and notes
- All 6 themes
- Email + push reminders for assessments
- Data export (PDF, CSV)
- Future: AI study suggestions, smart scheduling

### Implementation approach
- Store `plan: 'free' | 'pro'` in `user_profiles`
- Gate features in UI with soft paywalls (explain the benefit, link to upgrade)
- Never hard-block mid-flow — show the wall before the action
- Stripe for payments, Supabase edge function for webhook
