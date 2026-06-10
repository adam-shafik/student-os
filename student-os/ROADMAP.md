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

### ~~1. Study Stats~~ ✅
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

### ~~4. Auth + Onboarding UI Revamp~~ ✅
Full visual redesign of sign-in, sign-up, and onboarding screens.
- Framer Motion for step transitions and field animations
- Full-bleed background photo (dark study/library aesthetic)
- Glassmorphism card on auth page
- Split-panel layout on onboarding (brand left, form right)

### ~~5. Two-Semester Support~~ ✅
- Onboarding + Settings: 1 or 2 semesters, inter-semester break is the gap between them
- Per-semester week numbering (S1 W1–12, S2 W1–12), calendar labels `S1·W3` / `S2·W3`
- Domains tagged Sem 1 / Sem 2 / Full year; schedule scoped per semester

---

## The AI Arc (flashcards + assistant)

The whole point: StudentOS already holds unusually rich, structured context — domains, a real
semester/week model, schedule slots, **assessments with weights + grades**, week-confidence
ratings, study sessions, and notes. An AI layer here can reason over the user's *actual term* in a
way Notion / Apple Notes cannot. Flashcards and the assistant reinforce each other, so build them
as one arc.

### 6. Flashcards (no AI needed to start)
Mirror the notes folder structure so it feels native.
- New `flashcards` table: `domain_id`, `academic_week`, `front`, `back`, `deck_id`, plus SM-2
  spaced-repetition fields (`ease`, `interval`, `due_date`, `reps`). Decks scoped by domain + week.
- Review mode: "due today" queue, flip animation (framer-motion), grade Again / Hard / Good / Easy
  → SM-2 schedules the next review.
- Calendar + study tie-in: due-card count becomes a daily review event; a Pomodoro can be a
  "review" session that logs to `study_sessions`.
- Stats: retention %, cards due, streak.
- Monetizable by *volume* with zero AI cost (free = N decks, Pro = unlimited).

### 7. AI Assistant / Mascot
One assistant, many entry points, always fed the user's context.
- Global: floating "Ask StudentOS" button — knows upcoming assessments, free calendar slots,
  low-confidence weeks.
- In typed notes: select text → Explain / Summarize / **Make flashcards** / Quiz me.
  (Note → flashcard is the bridge that makes #6 explode. Start AI here — cheapest, clearest win.)
- Per domain: "What should I focus on this week?" using `week_confidence` × assessment weight ×
  days-until.
- Mascot: start with a clean assistant panel; optional animated SVG character later (no emoji).
- Handwritten notes: later — rasterize a canvas page to PNG and use Claude vision. Start with typed.

### 8. AI Study-Plan Generator (the Pro centerpiece)
Takes assessments + weights + current grades + week-confidence + free calendar slots → writes a
day-by-day plan straight into **todos and calendar study blocks**, prioritized by
`weight × (1 − confidence) × urgency`. Nothing else on the market does this with real grade data.

### 9. Smaller AI / data ideas
- Exam countdown ("days until") on domain cards — free, uses assessment dates.
- AI-suggested week confidence — infer from notes/sessions instead of manual rating.
- Quiz-me mode generated from a domain's notes.

---

## Model & Cost Strategy (Claude)
- Haiku 4.5 (`claude-haiku-4-5`) for cheap/high-volume: flashcard generation, summaries, autocomplete.
- Sonnet 4.6 (`claude-sonnet-4-6`) for the tutor + study-plan reasoning.
- Stream responses. Keep context tight (send only the relevant note/week, not everything) — you
  pay per token both ways.
- The API key lives ONLY in a Supabase Edge Function (server side). Never in the frontend.
- Gate every AI call behind a quota/plan check; log to an `ai_usage` table for quotas + abuse.

---

## Build Order
1. ~~Study Stats~~ ✅ (done)
2. Flashcards core (manual + SM-2 review) — high value, no AI dependency.
3. AI: "generate flashcards from this typed note" (Haiku) — links #6 and #7.
4. AI assistant panel + study-plan generator (Sonnet) — Pro centerpiece.
5. Stripe + plan gating — once there's something worth gating.

---

## Monetization Strategy

The AI is the natural Pro anchor: it has real per-call cost, so it can't be unlimited-free. That's
what makes the upgrade make sense.

### Free Tier
- Up to 5 domains
- Up to 30 notes (handwritten + typed combined)
- Flashcards capped (e.g. 3 decks)
- A small daily AI allowance (~5 actions/day) — enough to get hooked
- Default theme only
- No email/push reminders
- Calendar + todos + study timer: unlimited

### Pro Tier (~$4/month, $25/year, or a $9 "semester pass")
- Unlimited domains, notes, and flashcards
- Unlimited AI actions + the study-plan generator
- All 6 themes
- Email + push reminders for assessments
- Data export (PDF, CSV)
- (Semester pass fits how students think — and the semester model can enforce it.)

### Implementation approach
- Store `plan: 'free' | 'pro'` (and `plan_expires_at` for the semester pass) in `user_profiles`.
- Gate features in UI with soft paywalls (explain the benefit, link to upgrade). Never hard-block
  mid-flow — show the wall before the action.
- Stripe for payments → webhook → Supabase edge function flips `plan`.
- Cost control: Haiku by default, cache, cap context, rate-limit per `plan`.
