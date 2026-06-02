---
target: AuthPage
total_score: 27
p0_count: 0
p1_count: 3
timestamp: 2026-06-02T05-00-39Z
slug: src-pages-authpage-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Button spinners and email confirmation screen are good; Google OAuth has no in-progress signal before redirect |
| 2 | Match System / Real World | 4 | Clean, plain language throughout; university email placeholder is a nice specific touch |
| 3 | User Control and Freedom | 3 | Mode switching is free; "Back to sign in" from email screen exists; no recovery if wrong email entered before sending |
| 4 | Consistency and Standards | 3 | Inputs consistent; minor: tab buttons use border:none while everything else has 1px solid |
| 5 | Error Prevention | 2 | No inline email format check before submit; no password requirements shown; raw Supabase error on wrong credentials |
| 6 | Recognition Rather Than Recall | 4 | Two clear paths, labels above inputs, mode switching obvious |
| 7 | Flexibility and Efficiency | 2 | No autocomplete attributes on inputs; no forgot-password link anywhere |
| 8 | Aesthetic and Minimalist Design | 3 | Right panel is clean; left panel 45%-opacity bullets feel like hiding rather than earning their place |
| 9 | Error Recovery | 2 | Supabase raw strings shown verbatim; no fix suggestion |
| 10 | Help and Documentation | 1 | No forgot-password, no password hint, no terms/privacy |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

LLM assessment: Right-panel form passes the slop test. The tab-line layoutId is genuinely considered, the magnetic button is a premium touch. Left panel fails the second-order slop test — animated mesh gradient + 3 feature bullets = the saturated 2024-2026 dark SaaS auth template. Detector returned no findings (clean scan).

## Priority Issues

[P1] No forgot-password link — returning students with forgotten passwords have no exit.
[P1] Infinite CSS animation (meshShift, pulsing ring) with no prefers-reduced-motion fallback — WCAG AA failure.
[P1] Form labels not associated with inputs via htmlFor/id — screen readers cannot associate label with input.
[P2] Left panel is the saturated mesh-gradient SaaS auth template — fails second-order slop test against Arc reference.
[P2] Raw Supabase error messages displayed verbatim — "Invalid login credentials" gives no actionable guidance.

## Persona Red Flags

Jordan: No forgot-password. Wrong password = dead end. Labels not connected to inputs.
Sam: No reduced-motion fallback. Labels not associated. Focus indicators may be suppressed.
Nadia (project-specific): Orchestrated left-panel sequence on every load is extraneous at exam-week stress. meshShift is noisy in dark-room/night conditions.

## Minor Observations

- C.dim (#4a4c60) as "or" divider at 11px: ~1.4:1 contrast. Use C.muted.
- Feature bullets at rgba(232,233,240,0.45): ~3.9:1 on #080a12. Bump to 0.6 opacity minimum.
- No autocomplete="email"/autocomplete="current-password" on inputs.
- MagneticButton lacks type="submit"; double-submit risk on Enter + click.
- Google button uses onMouseEnter/onMouseLeave inconsistently with framer-motion whileTap used elsewhere.

## Questions to Consider

- What if the left panel showed a real screenshot of the app rather than bullet-point promises?
- Does a returning student at 11pm during exam week need the left panel at all? What if it only appeared on sign-up?
- What would a forgot-password flow look like if it reused the EmailSentScreen pattern? It's already half-built.
