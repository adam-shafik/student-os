import { useRef, useLayoutEffect, useState } from 'react'
import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, GraduationCap, LogOut, HelpCircle } from 'lucide-react'

const navItems = [
  { id: 'domains',  label: 'Domains',       icon: BookOpen    },
  { id: 'calendar', label: 'Calendar',      icon: Calendar    },
  { id: 'study',    label: 'Study Session', icon: Timer       },
  { id: 'notes',    label: 'Notes',         icon: FileText    },
  { id: 'todos',    label: 'To Do',         icon: CheckSquare },
]

function NavBtn({ label, Icon, isActive, onClick, btnRef }) {
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
        fontSize: 14, fontWeight: isActive ? 600 : 400,
        textAlign: 'left', transition: 'color 0.2s ease, font-weight 0.2s ease', width: '100%',
        boxShadow: isActive ? 'var(--glow-blue, none)' : 'none',
        fontFamily: 'inherit',
        position: 'relative', zIndex: 1,
      }}
      onMouseEnter={e => {
        if (!isActive) { e.currentTarget.style.color = 'var(--text-bright)' }
      }}
      onMouseLeave={e => {
        if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)' }
      }}
    >
      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
      {label}
    </button>
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
    <>
      {/* Wallpaper photo layer — blurred, behind everything */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'var(--bg-wallpaper-photo, none)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(var(--wallpaper-blur, 0px))',
        transform: 'scale(1.1)',
        opacity: 'var(--wallpaper-opacity, 1)',
      }} />
      {/* Color overlay — darkens/tints the photo, no blur */}
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
      {/* Sidebar — spans both rows so it's one unbroken element top to bottom */}
      <aside style={{
        gridColumn: '1', gridRow: '1 / 3',
        background: 'linear-gradient(to right, var(--bg-elevated) 0%, var(--bg-overlay) 60%, var(--bg-hover) 100%)',
        borderRight: 'none',
        display: 'flex', flexDirection: 'column',
        padding: '20px 10px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: 'var(--glow-blue)',
          }}>
            <GraduationCap size={17} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            StudentOS
          </span>
        </div>

        {/* Section label */}
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
          Navigation
        </span>

        {/* Nav items */}
        <nav ref={navRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: pillStyle.top, height: pillStyle.height,
            background: 'var(--nav-active)', borderRadius: 8,
            transition: pillStyle.ready ? 'top 0.28s cubic-bezier(0.32, 0.72, 0, 1), height 0.28s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
            pointerEvents: 'none',
          }} />
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
          <NavBtn
            id="tour"
            label="Take a Tour"
            Icon={HelpCircle}
            isActive={false}
            onClick={onStartTutorial}
          />

          <NavBtn
            id="settings"
            label="Settings"
            Icon={Settings}
            isActive={currentPage === 'settings'}
            onClick={() => onNavigate('settings')}
          />

          <button
            onClick={onSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', width: '100%', fontSize: 14, transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.color = '#fb7185' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={17} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Header strip */}
      <div style={{
        gridColumn: '2', gridRow: '1',
        background: 'linear-gradient(to right, var(--bg-hover) 0%, var(--bg-overlay) 100%)',
      }} />

      {/* Left corner cap */}
      <div style={{
        position: 'absolute',
        top: 52,
        left: 228,
        width: 16,
        height: 16,
        background: 'radial-gradient(circle at 100% 100%, transparent 0, transparent 16px, var(--bg-hover) 16px)',
        pointerEvents: 'none',
        zIndex: 5,
      }} />

      {/* Right corner cap — mirrors the left, bite carved at bottom-left */}
      <div style={{
        position: 'absolute',
        top: 52,
        right: 0,
        width: 16,
        height: 16,
        background: 'radial-gradient(circle at 0% 100%, transparent 0, transparent 16px, var(--bg-overlay) 16px)',
        pointerEvents: 'none',
        zIndex: 5,
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
          {children}
        </div>
      </main>
    </div>
    </>
  )
}
