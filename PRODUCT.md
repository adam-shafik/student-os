# Product

## Register

product

## Users

A university student building and using this app personally, primarily on iPad (PWA) and desktop (Electron). Technically proficient, comfortable with dark interfaces, uses it during study sessions, late-night review, and between classes. The audience is exactly one person — the builder.

## Product Purpose

A personal academic operating system: one place for Pomodoro study sessions, handwritten and typed notes, todos, calendar, and domain (subject) tracking. Success means the student never reaches for another tool during a study day.

## Brand Personality

Precise, nocturnal, personal. The app should feel purpose-built for one person, tuned exactly right. Tone: quiet confidence, zero corporate. Not a cheerful productivity app — a serious tool for a student who takes their work seriously.

## Anti-references

- Generic productivity SaaS (Notion, Todoist, TickTick): cream/white backgrounds, modal-heavy, interchangeable with a thousand competitors, no personality
- Over-decorated "developer aesthetic": glowing neon terminals where glow is decoration not information
- AI-generated dark dashboards: identical metric cards with gradient numbers, purple-to-blue everything, glassmorphism as default

## Design Principles

1. **Clarity is the bold move.** In a dark interface, hierarchy is contrast and scale. One large decisive element beats five medium ones. Make the important thing obviously important.
2. **Domain color is identity.** Every domain has a signature color. That color should read consistently across all surfaces — not just a tiny tag, but a recognizable presence.
3. **The timer owns the screen.** When a session is active, nothing competes. The countdown is the whole UI.
4. **Earn every surface.** Empty states teach; loaded states work. No decorative elements that don't carry information.
5. **Themes are first-class.** All visual amplifications must work across all themes via CSS custom properties. Never hard-code colors that should adapt.

## Accessibility & Inclusion

WCAG AA minimum. Touch-primary on iPad, mouse + keyboard on Electron desktop. Respect `prefers-reduced-motion`. Body text at minimum 4.5:1 contrast ratio on all themes.
