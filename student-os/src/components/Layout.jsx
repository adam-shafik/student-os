import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, GraduationCap, LogOut, HelpCircle } from 'lucide-react'

const navItems = [
  { id: 'domains',  label: 'Domains',       icon: BookOpen    },
  { id: 'calendar', label: 'Calendar',      icon: Calendar    },
  { id: 'study',    label: 'Study Session', icon: Timer       },
  { id: 'notes',    label: 'Notes',         icon: FileText    },
  { id: 'todos',    label: 'To Do',         icon: CheckSquare },
]

function NavBtn({ id, label, Icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, border: 'none',
        cursor: 'pointer',
        background: isActive ? 'var(--nav-active)' : 'transparent',
        color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
        fontSize: 14, fontWeight: isActive ? 600 : 400,
        textAlign: 'left', transition: 'all 0.15s ease', width: '100%',
        boxShadow: isActive ? 'var(--glow-blue, none)' : 'none',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!isActive) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--text-bright)' }
      }}
      onMouseLeave={e => {
        if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }
      }}
    >
      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
      {label}
    </button>
  )
}

export default function Layout({ currentPage, onNavigate, onSignOut, onStartTutorial, children }) {
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
          {navItems.map(item => (
            <NavBtn
              key={item.id}
              id={item.id}
              label={item.label}
              Icon={item.icon}
              isActive={currentPage === item.id || (currentPage === 'domain-detail' && item.id === 'domains')}
              onClick={() => onNavigate(item.id)}
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

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
