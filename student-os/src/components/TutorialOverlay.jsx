import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowRight } from 'lucide-react'

const PAD = 8

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

export default function TutorialOverlay({ userName, hasDomains, stepIndex, currentPage, onNavigate, onAdvance, onClose }) {
  const steps = useMemo(() => buildSteps(userName, hasDomains), [userName, hasDomains])
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const [rect, setRect] = useState(null)
  const wh = window.innerHeight
  const ww = window.innerWidth

  // Auto-navigate when a step declares a target page
  useEffect(() => {
    if (step.page) onNavigate(step.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  // Find target element — re-runs when currentPage changes so new page DOM is ready
  useEffect(() => {
    if (!step.targetId) { setRect(null); return }
    let t1
    const raf = requestAnimationFrame(() => {
      const find = () => document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
      const measure = (el) => {
        if (step.scrollTo) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' })
        }
        setRect(el.getBoundingClientRect())
      }
      const el = find()
      if (el) {
        measure(el)
      } else {
        t1 = setTimeout(() => {
          const el2 = find()
          if (el2) measure(el2); else setRect(null)
        }, 150)
      }
    })
    return () => { cancelAnimationFrame(raf); clearTimeout(t1) }
  }, [step.id, step.targetId, currentPage])

  const handleAdvance = useCallback(() => {
    if (stepIndex >= steps.length - 1) onClose()
    else onAdvance(stepIndex + 1)
  }, [stepIndex, steps.length, onAdvance, onClose])

  // Page-change step: advances when user navigates to the expected page
  useEffect(() => {
    if (step.type === 'page-change' && step.waitForPage && currentPage === step.waitForPage) {
      handleAdvance()
    }
  }, [currentPage, step.type, step.waitForPage, handleAdvance])

  // Click step: advance when the highlighted element is clicked
  useEffect(() => {
    if (step.type !== 'click' || !step.targetId) return
    let el = null
    const raf = requestAnimationFrame(() => {
      el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`)
      if (el) el.addEventListener('click', handleAdvance)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (el) el.removeEventListener('click', handleAdvance)
    }
  }, [step.type, step.targetId, handleAdvance, currentPage])

  const isCenter = step.type === 'center'
  const isPageChange = step.type === 'page-change'
  const nonCenterSteps = steps.filter(s => s.type !== 'center')
  const nonCenterIndex = steps.slice(0, stepIndex + 1).filter(s => s.type !== 'center').length

  let tooltipStyle = {}
  if (isCenter) {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  } else if (step.tooltipSide === 'bottom-corner') {
    tooltipStyle = { bottom: 32, right: 32 }
  } else if (rect) {
    if (step.tooltipSide === 'right') {
      tooltipStyle = {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 100, wh - 260)),
        left: rect.right + PAD + 20,
      }
    } else {
      tooltipStyle = {
        top: rect.bottom + PAD + 16,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - 153, ww - 322)),
      }
    }
  } else {
    tooltipStyle = { bottom: 32, right: 32 }
  }

  const showTooltip = isCenter || rect || step.tooltipSide === 'bottom-corner'

  return (
    <>
      <style>{`
        @keyframes _tut-pulse {
          0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px rgba(91,140,255,0.7), 0 0 20px rgba(91,140,255,0.18); }
          50%      { box-shadow: 0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 5px rgba(91,140,255,0.25), 0 0 36px rgba(91,140,255,0.42); }
        }
        @keyframes _tut-dot  { 0%,100%{opacity:1} 50%{opacity:0.12} }
        @keyframes _tut-in   { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes _tut-in-c { from{opacity:0;transform:translate(-50%,-50%) scale(0.94)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>

      {isCenter ? (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9990 }} />
      ) : rect ? (
        <div style={{
          position:'fixed', pointerEvents:'none', zIndex:9990,
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + PAD*2, height: rect.height + PAD*2,
          borderRadius: 14,
          animation: '_tut-pulse 2s ease-in-out infinite',
          transition: 'top 0.35s cubic-bezier(0.32,0.72,0,1), left 0.35s cubic-bezier(0.32,0.72,0,1), width 0.35s cubic-bezier(0.32,0.72,0,1), height 0.35s cubic-bezier(0.32,0.72,0,1)',
        }} />
      ) : (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:9990 }} />
      )}

      <button
        onClick={onClose}
        style={{
          position:'fixed', bottom:20, left:10, width:208, zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)',
          background:'rgba(255,255,255,0.05)',
          fontSize:13, color:'rgba(255,255,255,0.38)',
          cursor:'pointer', transition:'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color='rgba(255,255,255,0.72)'; e.currentTarget.style.background='rgba(255,255,255,0.09)' }}
        onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.38)'; e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
      >
        Skip tour
      </button>

      {showTooltip && (
        <div style={{
          position:'fixed',
          ...tooltipStyle,
          zIndex:9995,
          width: isCenter ? 460 : 310,
          background:'rgba(11,12,19,0.98)',
          backdropFilter:'blur(24px)',
          border:'1px solid rgba(91,140,255,0.22)',
          borderRadius:20,
          padding: isCenter ? '40px 44px' : '22px 24px',
          boxShadow:'0 16px 60px rgba(0,0,0,0.82), 0 0 0 1px rgba(91,140,255,0.07)',
          pointerEvents:'all',
          animation: isCenter ? '_tut-in-c 0.28s cubic-bezier(0.34,1.3,0.64,1)' : '_tut-in 0.22s ease',
        }}>
          {!isCenter && (
            <div style={{ display:'flex', gap:3, marginBottom:16 }}>
              {nonCenterSteps.map((_, i) => (
                <div key={i} style={{
                  flex:1, height:3, borderRadius:2,
                  background: i < nonCenterIndex ? '#5b8cff' : 'rgba(255,255,255,0.1)',
                  transition:'background 0.3s',
                }} />
              ))}
            </div>
          )}

          <div style={{ fontSize: isCenter ? 22 : 16, fontWeight:700, color:'#fff', marginBottom:10, lineHeight:1.3 }}>
            {step.title}
          </div>

          <div style={{ fontSize:14, color:'rgba(255,255,255,0.63)', lineHeight:1.75, marginBottom: isCenter ? 34 : 20 }}>
            {step.body}
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
            {isPageChange ? (
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(91,140,255,0.88)', fontWeight:500 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#5b8cff', animation:'_tut-dot 1.4s ease-in-out infinite' }} />
                Tap any card to continue
              </div>
            ) : (
              <button
                onClick={step.type === 'click'
                  ? () => { const el = document.querySelector(`[data-tutorial-id="${step.targetId}"]`); if (el) el.click(); else handleAdvance() }
                  : handleAdvance}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'10px 22px', borderRadius:12,
                  background:'linear-gradient(135deg, #5b8cff 0%, #a78bfa 100%)',
                  border:'none', cursor:'pointer',
                  fontSize:14, fontWeight:600, color:'white',
                  boxShadow:'0 4px 20px rgba(91,140,255,0.4)',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 28px rgba(91,140,255,0.6)'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(91,140,255,0.4)'; e.currentTarget.style.transform='' }}
              >
                {step.nextLabel ?? 'Next'}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
