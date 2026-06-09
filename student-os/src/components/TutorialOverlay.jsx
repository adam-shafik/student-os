import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const PAD       = 8
const CARD_W    = 310
const CENTER_W  = 460
const CENTER_H  = 360
const TOOLTIP_H = 220

const SPRING     = { type: 'spring', stiffness: 320, damping: 32 }
const SPRING_BTN = { type: 'spring', stiffness: 400, damping: 20 }
const SPRING_POS = { opacity: { duration: 0.2 }, top: SPRING, left: SPRING, width: SPRING }

function buildSteps(name, hasDomains) {
  const n = name || 'there'
  const domainSteps = hasDomains ? [
    {
      id: 'domains',
      type: 'page-change',
      page: 'domains',
      targetId: 'domains-grid',
      waitForPage: 'domain-detail',
      title: 'Your domains',
      body: `These are your subjects, projects, and anything else you're tracking. Each one has its own schedule, progress, notes, and more. Tap any card to see what's inside.`,
      tooltipSide: 'bottom-corner',
    },
    {
      id: 'domain-detail',
      type: 'next',
      page: null,
      targetId: 'domain-detail-tabs',
      title: 'Inside a domain',
      body: `Everything about this subject lives here: weekly schedule, progress tracking, linked notes, and study sessions. Use the tabs to explore each section.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
    },
    {
      id: 'assessments-tab',
      type: 'click',
      page: null,
      targetId: 'assessments-tab-btn',
      title: 'Track your grades',
      body: `The Assessments tab is where your exams and assignments live, with weights, deadlines, and grades. Click Assessments to see it.`,
      tooltipSide: 'bottom',
    },
    {
      id: 'assessments-showcase',
      type: 'next',
      page: null,
      targetId: 'assessments-stats',
      title: 'Grade tracker and predictor',
      body: `Add your exams and assignments here with their weights. Enter grades as they come in, or add a predicted grade for upcoming ones. Set a target grade and StudentOS works out exactly what you need to hit it.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
    },
  ] : [
    {
      id: 'domains-empty',
      type: 'next',
      page: 'domains',
      targetId: 'domains-grid',
      title: 'Your domains live here',
      body: `Each subject, project, or commitment gets its own domain. Add one and everything connects: schedule slots, grade tracking, notes, and study sessions all in one place. Hit the + button whenever you're ready.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
    },
  ]

  return [
    {
      id: 'welcome',
      type: 'center',
      page: null,
      targetId: null,
      title: `Hey ${n}, welcome to StudentOS`,
      body: `Let's do a quick walkthrough so you know what's where and how everything connects. Takes about 90 seconds. You can skip anytime.`,
      nextLabel: 'Start tour',
    },
    ...domainSteps,
    {
      id: 'calendar',
      type: 'next',
      page: 'calendar',
      targetId: 'calendar-grid',
      title: 'Your calendar',
      body: `Once your schedule is set up, every lecture, lab, and session fills in here automatically. You can also add one-off events like exams, appointments, or anything else.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
    },
    {
      id: 'schedule-settings',
      type: 'next',
      page: 'settings',
      targetId: 'schedule-settings',
      title: 'Build your timetable',
      body: `Whenever you are ready, come here to add your lectures, labs, and recurring sessions. They will show up in your calendar and track against your academic weeks automatically.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
      scrollTo: true,
    },
    {
      id: 'study-overview',
      type: 'click',
      page: 'study',
      targetId: 'study-new-btn',
      title: 'Study sessions',
      body: `Track your focus time with Pomodoro sessions, linked to domains and notes. Click New Session to see how it works.`,
      tooltipSide: 'bottom',
    },
    {
      id: 'study-modal',
      type: 'next',
      page: null,
      targetId: 'study-modal-content',
      title: 'Configure a session',
      body: `Pick a domain, write your topic, choose a Pomodoro preset or go custom, and optionally open a linked note that saves with the session. All sessions are recorded so you can review your study history.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
    },
    {
      id: 'notes',
      type: 'next',
      page: 'notes',
      targetId: 'notes-new-btn',
      title: 'Notes',
      body: `Create handwritten canvas notes or typed notes, linked to your domains, study sessions, or calendar events. Everything connects back to where it came from.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom',
    },
    {
      id: 'todos-overview',
      type: 'next',
      page: 'todos',
      targetId: 'todos-new-btn',
      title: 'To do',
      body: `Keep all your tasks here with priorities, due dates, and domain links. Tasks can be pinned to a specific academic week and grouped by domain, priority, or due date.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom',
    },
    {
      id: 'themes',
      type: 'next',
      page: 'settings',
      targetId: 'theme-switcher',
      title: 'Make StudentOS yours',
      body: `Switch themes anytime from Settings. Pick whatever feels right and it syncs across all your devices.`,
      nextLabel: 'Got it',
      tooltipSide: 'bottom-corner',
      scrollTo: true,
    },
    {
      id: 'done',
      type: 'center',
      page: 'domains',
      targetId: null,
      title: `You're all set`,
      body: `We built StudentOS for students who are done procrastinating. Everything you need, all in one place. Explore at your own pace and retake this tour anytime from the sidebar.`,
      nextLabel: "Let's go!",
    },
  ]
}

function useScramble(text, disabled) {
  const [displayed, setDisplayed] = useState(text)
  const prev = useRef(text)
  useEffect(() => {
    if (disabled || text === prev.current) { setDisplayed(text); return }
    prev.current = text
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let frame = 0
    const id = setInterval(() => {
      frame++
      if (frame >= 14) { setDisplayed(text); clearInterval(id); return }
      const ratio = frame / 14
      setDisplayed(
        text.split('').map((ch, i) =>
          ch === ' ' || i < Math.floor(text.length * ratio)
            ? ch
            : chars[Math.floor(Math.random() * chars.length)]
        ).join('')
      )
    }, 30)
    return () => clearInterval(id)
  }, [text, disabled])
  return displayed
}

export default function TutorialOverlay({ userName, hasDomains, stepIndex, currentPage, onNavigate, onAdvance, onClose }) {
  const steps  = useMemo(() => buildSteps(userName, hasDomains), [userName, hasDomains])
  const step   = steps[Math.min(stepIndex, steps.length - 1)]
  const [rect, setRect] = useState(null)
  const [cardH, setCardH] = useState(TOOLTIP_H)
  const cardRef = useRef(null)
  const wh = window.innerHeight
  const ww = window.innerWidth
  const isMobile   = ww < 600
  const cardW      = isMobile ? Math.min(CARD_W, ww - 32) : CARD_W
  const centerW    = isMobile ? Math.min(CENTER_W, ww - 32) : CENTER_W
  const centerPadX = isMobile ? 24 : 48
  const centerPadY = isMobile ? 28 : 44
  const prefersReduced = useReducedMotion() ?? false
  const displayedTitle = useScramble(step.title, prefersReduced)

  useEffect(() => {
    if (step.page) onNavigate(step.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  useEffect(() => {
    if (!step.targetId) { setRect(null); return }
    let t1
    const raf = requestAnimationFrame(() => {
      const find    = () => document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
      const measure = (el) => {
        if (step.scrollTo) el.scrollIntoView({ behavior: 'instant', block: 'center' })
        setRect(el.getBoundingClientRect())
      }
      const el = find()
      if (el) { measure(el) }
      else { t1 = setTimeout(() => { const el2 = find(); if (el2) measure(el2); else setRect(null) }, 150) }
    })
    return () => { cancelAnimationFrame(raf); clearTimeout(t1) }
  }, [step.id, step.targetId, currentPage])

  useEffect(() => {
    const el = cardRef.current
    if (!el) { setCardH(TOOLTIP_H); return }
    const update = () => setCardH(el.getBoundingClientRect().height || TOOLTIP_H)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [step.id, step.type, cardW, currentPage])

  const handleAdvance = useCallback(() => {
    if (stepIndex >= steps.length - 1) onClose()
    else onAdvance(stepIndex + 1)
  }, [stepIndex, steps.length, onAdvance, onClose])

  useEffect(() => {
    if (step.type === 'page-change' && step.waitForPage && currentPage === step.waitForPage) handleAdvance()
  }, [currentPage, step.type, step.waitForPage, handleAdvance])

  useEffect(() => {
    if (step.type !== 'click' || !step.targetId) return
    let el = null
    const raf = requestAnimationFrame(() => {
      el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
      if (el) el.addEventListener('click', handleAdvance)
    })
    return () => { cancelAnimationFrame(raf); if (el) el.removeEventListener('click', handleAdvance) }
  }, [step.type, step.targetId, handleAdvance, currentPage])

  const isCenter    = step.type === 'center'
  const isPageChange = step.type === 'page-change'
  const nonCenterSteps = steps.filter(s => s.type !== 'center')
  const nonCenterIndex = steps.slice(0, stepIndex + 1).filter(s => s.type !== 'center').length

  // All positions as top+left so framer-motion springs consistently between them
  // Mobile: always center horizontally and pin near bottom, above home indicator
  const safeBottom = isMobile ? 88 : 48
  let tooltipTop  = wh - safeBottom - cardH
  let tooltipLeft = isMobile ? (ww - cardW) / 2 : ww - 48 - CARD_W

  if (rect && !isMobile) {
    if (step.tooltipSide === 'right') {
      tooltipTop  = Math.max(16, Math.min(rect.top + rect.height / 2 - cardH / 2, wh - cardH - 16))
      tooltipLeft = rect.right + PAD + 20
    } else if (step.tooltipSide !== 'bottom-corner') {
      tooltipTop  = rect.bottom + PAD + 16
      tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - CARD_W / 2, ww - CARD_W - 16))
    }
  } else if (rect && isMobile && step.tooltipSide !== 'bottom-corner') {
    // On mobile, place below target if room; otherwise above
    const below = rect.bottom + PAD + 8
    const above = rect.top - PAD - 8 - cardH
    tooltipTop = below + cardH < wh - safeBottom ? below : Math.max(8, above)
    tooltipLeft = (ww - cardW) / 2
  }
  tooltipTop = Math.max(8, Math.min(tooltipTop, wh - safeBottom - cardH))

  const showTooltip = isCenter || rect || step.tooltipSide === 'bottom-corner'

  const cardBase = {
    position: 'fixed',
    zIndex: 9995,
    background: 'rgba(11,12,19,0.98)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(91,140,255,0.32)',
    borderRadius: 16,
    boxShadow: '0 24px 80px rgba(0,0,0,0.78), 0 0 0 1px rgba(91,140,255,0.10)',
    pointerEvents: 'all',
    overflow: 'hidden',
  }

  const ctaClick = step.type === 'click'
    ? () => { const el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`); if (el) el.click(); else handleAdvance() }
    : handleAdvance

  const innerContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: prefersReduced ? 0 : -6 }}
        transition={{ duration: 0.18, ease: 'easeOut', delay: 0.08 }}
      >
        {!isCenter && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
            {nonCenterSteps.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < nonCenterIndex ? '#5b8cff' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ scale: (step.id === 'done' && !prefersReduced) ? 0.72 : 1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={step.id === 'done' && !prefersReduced
            ? { type: 'spring', stiffness: 220, damping: 18, delay: 0.12 }
            : { duration: 0.15 }
          }
          style={{ fontSize: isCenter ? (isMobile ? 22 : 28) : 15, fontWeight: isCenter ? 800 : 700, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}
        >
          {displayedTitle}
        </motion.div>

        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, marginBottom: isCenter ? 36 : 20 }}>
          {step.body}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {isPageChange ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(91,140,255,0.88)', fontWeight: 500 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b8cff', animation: '_tut-dot 1.4s ease-in-out infinite' }} />
              Tap any card to continue
            </div>
          ) : (
            <motion.button
              onClick={ctaClick}
              whileHover={prefersReduced ? {} : { y: -1 }}
              whileTap={prefersReduced ? {} : { scale: 0.96 }}
              transition={SPRING_BTN}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '12px 26px', borderRadius: 12,
                background: '#5b8cff', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: 'white',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(91,140,255,0.45)',
              }}
            >
              {step.nextLabel ?? 'Next'}
              <ArrowRight size={14} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )

  return (
    <>
      <style>{`
        @keyframes _tut-pulse {
          0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px rgba(91,140,255,0.7), 0 0 20px rgba(91,140,255,0.18); }
          50%      { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 5px rgba(91,140,255,0.25), 0 0 36px rgba(91,140,255,0.42); }
        }
        @keyframes _tut-ring1 {
          0%   { box-shadow: 0 0 0 0px  rgba(91,140,255,0.28); }
          100% { box-shadow: 0 0 0 22px rgba(91,140,255,0); }
        }
        @keyframes _tut-ring2 {
          0%   { box-shadow: 0 0 0 0px  rgba(91,140,255,0.14); }
          100% { box-shadow: 0 0 0 42px rgba(91,140,255,0); }
        }
        @keyframes _tut-clip {
          from { clip-path: circle(0% at 50% 50%); }
          to   { clip-path: circle(150% at 50% 50%); }
        }
        @keyframes _tut-dot { 0%,100%{opacity:1} 50%{opacity:0.12} }
        @media (prefers-reduced-motion: reduce) {
          ._tut-anim { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Backdrop */}
      {isCenter ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9990 }} />
      ) : rect ? (
        <motion.div
          className="_tut-anim"
          style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9990, borderRadius: 14, animation: '_tut-pulse 2s ease-in-out infinite' }}
          animate={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          transition={prefersReduced ? { duration: 0 } : SPRING}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9990 }} />
      )}

      {/* Expanding rings */}
      {rect && !prefersReduced && <>
        <div className="_tut-anim" style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9989,
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: 14, animation: '_tut-ring1 1.6s ease-out infinite',
        }} />
        <div className="_tut-anim" style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9988,
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          borderRadius: 14, animation: '_tut-ring2 1.6s ease-out 0.4s infinite',
        }} />
      </>}

      {/* Skip button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 8px))',
          left: isMobile ? 16 : 10, width: isMobile ? 'calc(100vw - 32px)' : 208, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.05)',
          fontSize: 13, color: 'rgba(255,255,255,0.38)',
          cursor: 'pointer', transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      >
        Skip tour
      </button>

      {/* Center card — welcome + done — clip-path reveal */}
      <AnimatePresence>
        {isCenter && (
          <motion.div
            key="center-card"
            className="_tut-anim"
            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReduced ? 1 : 0.94 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            style={{
              ...cardBase,
              top: Math.max(16, (wh - CENTER_H) / 2),
              left: (ww - centerW) / 2,
              width: centerW,
              padding: `${centerPadY}px ${centerPadX}px`,
              animation: prefersReduced ? undefined : '_tut-clip 0.45s cubic-bezier(0.32,0.72,0,1) forwards',
            }}
          >
            {innerContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip card — persists across non-center steps, springs between positions */}
      <AnimatePresence>
        {!isCenter && showTooltip && (
          <motion.div
            ref={cardRef}
            key="tooltip-card"
            initial={{ opacity: 0, top: tooltipTop, left: tooltipLeft, width: cardW }}
            animate={{ opacity: 1, top: tooltipTop, left: tooltipLeft, width: cardW }}
            exit={{ opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : SPRING_POS}
            style={{ ...cardBase, padding: '22px 24px' }}
          >
            {innerContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
