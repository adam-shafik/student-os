import { useState } from 'react'
import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, GraduationCap, Palette, X, Check, LogOut, HelpCircle } from 'lucide-react'
import { THEMES } from '../theme'

const navItems = [
  { id: 'domains',  label: 'Domains',       icon: BookOpen    },
  { id: 'calendar', label: 'Calendar',      icon: Calendar    },
  { id: 'study',    label: 'Study Session', icon: Timer       },
  { id: 'notes',    label: 'Notes',         icon: FileText    },
  { id: 'todos',    label: 'To Do',         icon: CheckSquare },
]

function ThemeSwitcher({ theme, onThemeChange, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 56,
          left: 10,
          width: 240,
          background: 'var(--bg-surface)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-strong)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
          zIndex: 2001,
        }}
      >
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Palette size={13} color="var(--accent-purple)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>Themes</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: '6px 6px' }}>
          {THEMES.map(t => {
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => { onThemeChange(t.id); onClose() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--nav-active)' : 'transparent',
                  textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--nav-hover)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {t.preview.map((c, i) => (
                    <div key={i} style={{ width: i === 2 ? 10 : 7, height: 18, borderRadius: 3, background: c, opacity: i === 2 ? 0.5 : 1 }} />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)', marginBottom: 1 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                </div>
                {isActive && <Check size={12} color="var(--accent-blue)" style={{ flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Layout({ currentPage, onNavigate, theme, onThemeChange, onSignOut, onStartTutorial, children }) {
  const [themeOpen, setThemeOpen] = useState(false)

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg-page)',
      backgroundImage: 'var(--bg-body-image)',
      overflow: 'hidden',
    }}>
      <aside style={{
        width: 228, flexShrink: 0,
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border)',
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
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--nav-active)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  boxShadow: isActive ? 'var(--glow-blue, none)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--nav-hover)'
                    e.currentTarget.style.color = 'var(--text-bright)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={onStartTutorial}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', width: '100%', fontSize: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <HelpCircle size={17} strokeWidth={1.8} />
            Take a Tour
          </button>

          <button
            data-tutorial-id="sidebar-themes"
            onClick={() => setThemeOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: themeOpen ? 'var(--nav-active)' : 'transparent',
              color: themeOpen ? 'var(--accent-purple)' : 'var(--text-secondary)',
              cursor: 'pointer', width: '100%', fontSize: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!themeOpen) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-bright)' } }}
            onMouseLeave={e => { if (!themeOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
          >
            <Palette size={17} strokeWidth={1.8} />
            Themes
          </button>

          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', width: '100%', fontSize: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-bright)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Settings size={17} strokeWidth={1.8} />
            Settings
          </button>

          <button
            onClick={onSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', width: '100%', fontSize: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.color = '#fb7185' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={17} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
          {children}
        </div>
      </main>

      {themeOpen && (
        <ThemeSwitcher
          theme={theme}
          onThemeChange={onThemeChange}
          onClose={() => setThemeOpen(false)}
        />
      )}
    </div>
  )
}
