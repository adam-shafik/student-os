import { useRef, useLayoutEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, LogOut, HelpCircle } from 'lucide-react'
import { useIsMobile } from '../utils/useIsMobile'

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

function BottomNav({ currentPage, onNavigate }) {
  const activeIndex = navItems.findIndex(item =>
    currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')
  )
  const pct = activeIndex >= 0 ? `${activeIndex * (100 / navItems.length)}%` : '0%'

  return (
    <nav style={{
      background: 'var(--chrome-bg)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      position: 'relative', flexShrink: 0,
    }}>
      {/* Sliding pill */}
      {activeIndex >= 0 && (
        <motion.div
          animate={{ left: pct }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
          style={{
            position: 'absolute', top: 6, bottom: 6,
            width: `${100 / navItems.length}%`,
            background: 'var(--nav-active)', borderRadius: 8,
            pointerEvents: 'none',
          }}
        />
      )}
      {navItems.map(item => {
        const isActive = currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')
        return (
          <motion.button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            whileTap={{ scale: 0.94, transition: { duration: 0.08 } }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, padding: '8px 4px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              fontFamily: 'inherit', position: 'relative', zIndex: 1,
              transition: 'color 0.15s ease', letterSpacing: '0.1px',
              minHeight: 52,
            }}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            {item.label}
          </motion.button>
        )
      })}
    </nav>
  )
}

export default function Layout({ currentPage, onNavigate, onSignOut, onStartTutorial, children }) {
  const navRef     = useRef()
  const navBtnRefs = useRef({})
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 0, ready: false })
  const isMobile = useIsMobile()

  const activeId = navItems.find(item =>
    currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')
  )?.id

  useLayoutEffect(() => {
    if (!activeId || isMobile) return
    const btn = navBtnRefs.current[activeId]
    const nav = navRef.current
    if (!btn || !nav) return
    const bRect = btn.getBoundingClientRect()
    const cRect = nav.getBoundingClientRect()
    setPillStyle(prev => ({ top: bRect.top - cRect.top, height: bRect.height, ready: prev.ready || true }))
  }, [activeId, isMobile])

  const wallpaperLayers = <>
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      backgroundImage: 'var(--bg-wallpaper-photo, none)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      filter: 'blur(var(--wallpaper-blur, 0px))',
      transform: 'scale(1.1)',
      opacity: 'var(--wallpaper-opacity, 1)',
    }} />
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      background: 'var(--wallpaper-overlay, transparent)',
    }} />
  </>

  const pageContent = (
    <div className="page-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <motion.div
        key={currentPage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </div>
  )

  if (isMobile) {
    return (
      <MotionConfig reducedMotion="user">
        {wallpaperLayers}
        <div style={{
          display: 'flex', flexDirection: 'column',
          height: '100dvh',
          background: 'var(--layout-bg)',
          backgroundImage: 'var(--bg-body-image)',
          position: 'relative',
        }}>
          {/* Mobile header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'max(env(safe-area-inset-top), 12px) 16px 12px',
            background: 'var(--chrome-bg)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/icons/icon-192.png" alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                StudentOS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <motion.button
                onClick={onStartTutorial}
                whileTap={{ scale: 0.93 }}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <HelpCircle size={17} strokeWidth={1.8} />
              </motion.button>
              <motion.button
                onClick={() => onNavigate('settings')}
                whileTap={{ scale: 0.93 }}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: currentPage === 'settings' ? 'var(--nav-active)' : 'transparent',
                  color: currentPage === 'settings' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Settings size={17} strokeWidth={1.8} />
              </motion.button>
              <motion.button
                onClick={onSignOut}
                whileTap={{ scale: 0.93 }}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: 'transparent', color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fb7185' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <LogOut size={17} strokeWidth={1.8} />
              </motion.button>
            </div>
          </div>

          {/* Page content */}
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {pageContent}
          </main>

          {/* Bottom nav */}
          <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        </div>
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      {wallpaperLayers}

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
        {/* Sidebar */}
        <aside style={{
          gridColumn: '1', gridRow: '1 / 3',
          background: 'var(--chrome-bg)',
          display: 'flex', flexDirection: 'column',
          padding: '20px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 24 }}>
            <img src="/icons/icon-192.png" alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              StudentOS
            </span>
          </div>

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

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <NavBtn label="Take a Tour" Icon={HelpCircle} isActive={false} onClick={onStartTutorial} />
            <NavBtn label="Settings" Icon={Settings} isActive={currentPage === 'settings'} onClick={() => onNavigate('settings')} />
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
        <div style={{ gridColumn: '2', gridRow: '1', background: 'var(--chrome-bg)' }} />

        {/* Corner caps */}
        <div style={{
          position: 'absolute', top: 52, left: 228, width: 16, height: 16,
          background: 'radial-gradient(circle at 100% 100%, transparent 0, transparent 16px, var(--chrome-bg) 16px)',
          pointerEvents: 'none', zIndex: 5,
        }} />
        <div style={{
          position: 'absolute', top: 52, right: 0, width: 16, height: 16,
          background: 'radial-gradient(circle at 0% 100%, transparent 0, transparent 16px, var(--chrome-bg) 16px)',
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
          {pageContent}
        </main>
      </div>
    </MotionConfig>
  )
}
