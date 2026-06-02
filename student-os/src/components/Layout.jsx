import { useRef, useLayoutEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, LogOut, HelpCircle } from 'lucide-react'

const navItems = [
  { id: 'domains',  label: 'Domains',  icon: BookOpen    },
  { id: 'calendar', label: 'Calendar', icon: Calendar    },
  { id: 'study',    label: 'Study',    icon: Timer       },
  { id: 'notes',    label: 'Notes',    icon: FileText    },
  { id: 'todos',    label: 'To Do',    icon: CheckSquare },
]

function NavBtn({ label, Icon, isActive, onClick, btnRef }) {
  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      whileTap={{ scale: 0.97, transition: { duration: 0.08, ease: 'easeIn' } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, border: 'none',
        cursor: 'pointer', background: 'transparent',
        color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
        fontSize: 14, fontWeight: isActive ? 600 : 400,
        textAlign: 'left', width: '100%',
        fontFamily: 'inherit', position: 'relative', zIndex: 1,
        transition: 'color 0.15s ease',
        letterSpacing: isActive ? '-0.1px' : 'inherit',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
      {label}
    </motion.button>
  )
}

export default function Layout({ currentPage, onNavigate, onSignOut, onStartTutorial, children }) {
  const navRef     = useRef()
  const navBtnRefs = useRef({})
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 0, ready: false })

  const activeId = navItems.find(item =>
    currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')
  )?.id

  useLayoutEffect(() => {
    if (!activeId) return
    const btn = navBtnRefs.current[activeId]
    const nav = navRef.current
    if (!btn || !nav) return
    const bRect = btn.getBoundingClientRect()
    const cRect = nav.getBoundingClientRect()
    setPillStyle(prev => ({ top: bRect.top - cRect.top, height: bRect.height, ready: prev.ready || true }))
  }, [activeId])

  return (
    <MotionConfig reducedMotion="user">
      {/* Wallpaper photo layer — blurred, behind everything */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'var(--bg-wallpaper-photo, none)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(var(--wallpaper-blur, 0px))',
        transform: 'scale(1.1)',
        opacity: 'var(--wallpaper-opacity, 1)',
      }} />
      {/* Color overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'var(--wallpaper-overlay, transparent)',
      }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '228px 1fr',
        gridTemplateRows: '52px 1fr',
        height: '100vh',
        background: 'var(--layout-bg)',
        backgroundImage: 'var(--bg-body-image)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Sidebar — spans both rows */}
        <aside style={{
          gridColumn: '1', gridRow: '1 / 3',
          background: 'var(--bg-elevated)',
          display: 'flex', flexDirection: 'column',
          padding: '20px 10px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 24 }}>
            <img
              src="/icons/icon-192.png"
              alt=""
              style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              StudentOS
            </span>
          </div>

          {/* Nav items */}
          <nav ref={navRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
            <motion.div
              style={{
                position: 'absolute', left: 0, right: 0,
                background: 'var(--nav-active)', borderRadius: 8,
                pointerEvents: 'none',
              }}
              animate={{ top: pillStyle.top, height: pillStyle.height }}
              transition={pillStyle.ready
                ? { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }
                : { duration: 0 }
              }
            />
            {navItems.map(item => (
              <NavBtn
                key={item.id}
                label={item.label}
                Icon={item.icon}
                isActive={currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')}
                onClick={() => onNavigate(item.id)}
                btnRef={el => { if (el) navBtnRefs.current[item.id] = el; else delete navBtnRefs.current[item.id] }}
              />
            ))}
          </nav>

          {/* Bottom */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavBtn label="Take a Tour" Icon={HelpCircle} isActive={false} onClick={onStartTutorial} />
            <NavBtn
              label="Settings"
              Icon={Settings}
              isActive={currentPage === 'settings'}
              onClick={() => onNavigate('settings')}
            />
            <motion.button
              onClick={onSignOut}
              whileTap={{ scale: 0.97, transition: { duration: 0.08, ease: 'easeIn' } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: 'var(--text-secondary)',
                cursor: 'pointer', width: '100%', fontSize: 14,
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.color = '#fb7185' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <LogOut size={16} strokeWidth={1.8} />
              Sign Out
            </motion.button>
          </div>
        </aside>

        {/* Header strip */}
        <div style={{
          gridColumn: '2', gridRow: '1',
          background: 'linear-gradient(to right, var(--bg-hover) 0%, var(--bg-overlay) 100%)',
        }} />

        {/* Left corner cap */}
        <div style={{
          position: 'absolute', top: 52, left: 228,
          width: 16, height: 16,
          background: 'radial-gradient(circle at 100% 100%, transparent 0, transparent 16px, var(--bg-hover) 16px)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Right corner cap */}
        <div style={{
          position: 'absolute', top: 52, right: 0,
          width: 16, height: 16,
          background: 'radial-gradient(circle at 0% 100%, transparent 0, transparent 16px, var(--bg-overlay) 16px)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Main content */}
        <main style={{
          gridColumn: '2', gridRow: '2',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          <div className="page-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.12, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: { duration: 0.06, ease: 'easeIn' } }}
                style={{ height: '100%' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
