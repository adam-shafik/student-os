import { BookOpen, Calendar, Timer, FileText, CheckSquare, Settings, GraduationCap } from 'lucide-react'

const navItems = [
  { id: 'domains', label: 'Domains', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'study', label: 'Study Session', icon: Timer },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'todos', label: 'To Do', icon: CheckSquare },
]

export default function Layout({ currentPage, onNavigate, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0c13', overflow: 'hidden' }}>
      <aside style={{
        width: 228,
        flexShrink: 0,
        background: '#0f1018',
        borderRight: '1px solid #1e2030',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 10px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #5b8cff 0%, #a78bfa 100%)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <GraduationCap size={17} color="white" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#e6e7f0', letterSpacing: '-0.3px' }}>
            StudentOS
          </span>
        </div>

        {/* Section label */}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#4a4c60', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#1a1c2e' : 'transparent',
                  color: isActive ? '#5b8cff' : '#7c7e96',
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#141520'
                    e.currentTarget.style.color = '#c4c5d4'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#7c7e96'
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
        <div style={{ borderTop: '1px solid #1e2030', paddingTop: 12 }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: '#7c7e96',
              cursor: 'pointer', width: '100%', fontSize: 14,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#141520'; e.currentTarget.style.color = '#c4c5d4' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7c7e96' }}
          >
            <Settings size={17} strokeWidth={1.8} />
            Settings
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'hidden', background: '#0b0c13', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
