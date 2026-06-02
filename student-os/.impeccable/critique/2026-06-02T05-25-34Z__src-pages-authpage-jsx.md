---
target: AuthPage
total_score: 32
p0_count: 0
p1_count: 0
timestamp: 2026-06-02T05-25-34Z
slug: src-pages-authpage-jsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinners in buttons, ConfirmationScreen complete; Google OAuth no pre-redirect signal |
| 2 | Match System / Real World | 4 | Academic vocabulary correct throughout |
| 3 | User Control and Freedom | 4 | Forgot password, ConfirmationScreen back link, mode tabs — full recovery |
| 4 | Consistency and Standards | 3 | Tab buttons missing ARIA tab roles |
| 5 | Error Prevention | 3 | friendlyError() is good; still no inline email check or password hint |
| 6 | Recognition Rather Than Recall | 4 | All actions visible, labels connected to inputs |
| 7 | Flexibility and Efficiency | 3 | Forgot password closed the main gap; autocomplete added |
| 8 | Aesthetic and Minimalist Design | 3 | Right panel clean; C.dim on "teaching weeks" very low contrast |
| 9 | Error Recovery | 3 | friendlyError() actionable; email-not-confirmed routes correctly |
| 10 | Help and Documentation | 2 | Forgot password exists; no password requirements hint |
| **Total** | | **32/40** | **Good** |

## Anti-Patterns Verdict

Left panel now passes both orders of the slop test. "8 of 12 teaching weeks" + CS301/MATH/ECON timetable is highly specific. Borderline: the big-number + label + progress + chips is adjacent to the hero-metric template but holds because no gradient accent and the number conveys position not vanity. Detector: 0 findings.

## Priority Issues

[P2] C.dim (#4a4c60) on "teaching weeks" label: ~1.4:1 contrast against #080a12. Change to C.muted.
[P2] Tab buttons missing role="tablist"/role="tab"/aria-selected. Screen readers announce as plain buttons.
[P2] Error div missing role="alert". Dynamic errors are silent to screen readers.
[P3] No password requirements hint at sign-up. 6-char minimum only revealed after submit failure.

## What's Working

1. Left panel is now specific — 8 of 12 teaching weeks + timetable grid cannot be confused with any other product.
2. MotionConfig reducedMotion="user" is comprehensive — all framer-motion animations respect system preference.
3. Full auth flow complete — sign in, sign up, forgot password, confirmation screens, all with human-readable copy.

## Persona Red Flags

Jordan: Password length hint missing. Tab buttons not semantically tabs.
Sam: Error div has no role="alert". Tab buttons not a tab control semantically.
Nadia: No remaining red flags — static background, MotionConfig handles reduced motion.

## Minor Observations

- letterSpacing: '-2px' at 56px = -0.036em, within -0.04em floor. Fine.
- Three-step entrance sequence on left panel is mild orchestration, acceptable for auth surface.
- ConfirmationScreen correctly wraps its own MotionConfig in the early-return path.
