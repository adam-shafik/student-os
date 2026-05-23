import { useState, useEffect } from 'react'
import { Construction } from 'lucide-react'
import { getStoredTheme, applyTheme } from './theme'
import './App.css'
import Layout from './components/Layout'
import DomainsPage from './pages/DomainsPage'
import DomainDetailPage from './pages/DomainDetailPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import TodosPage from './pages/TodosPage'
import { initialDomains } from './data/domains'

function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 400, gap: 12, color: 'var(--text-muted)',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        width: 72, height: 72, borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Construction size={28} color="var(--text-muted)" />
      </div>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Coming soon — this section is in development</p>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(getStoredTheme)
  useEffect(() => { applyTheme(theme) }, [])

  const handleThemeChange = (id) => {
    setTheme(id)
    applyTheme(id)
  }

  const [currentPage,    setCurrentPage]    = useState('domains')
  const [previousPage,   setPreviousPage]   = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [domains,        setDomains]        = useState(initialDomains)
  const [customCalendarEvents, setCustomCalendarEvents] = useState([])
  const [eventNotes,    setEventNotes]    = useState({})
  const [notes,         setNotes]         = useState([])
  const [noteToOpen,    setNoteToOpen]    = useState(null)
  const [todos,         setTodos]         = useState([
    { id: 'todo-1', title: 'Review Week 6 lecture slides', domainId: 'cs301', dueDate: '2026-03-10', priority: 'high',   done: false, createdAt: '2026-03-05T10:00:00Z' },
    { id: 'todo-2', title: 'Finish Graph Algorithm Coursework', domainId: 'cs301', dueDate: '2026-03-10', priority: 'high',   done: false, createdAt: '2026-03-05T10:01:00Z' },
    { id: 'todo-3', title: 'Redo Transaction Management notes', domainId: 'cs302', dueDate: '2026-03-20', priority: 'medium', done: false, createdAt: '2026-03-05T10:02:00Z' },
    { id: 'todo-4', title: 'Read Chapter 4 of the textbook',   domainId: 'cs303', dueDate: null,         priority: 'low',    done: false, createdAt: '2026-03-05T10:03:00Z' },
    { id: 'todo-5', title: 'Practice past exam papers',        domainId: 'cs301', dueDate: '2026-05-10', priority: 'medium', done: false, createdAt: '2026-03-05T10:04:00Z' },
    { id: 'todo-6', title: 'Email Dr. Smith about coursework', domainId: null,    dueDate: '2026-03-08', priority: 'medium', done: false, createdAt: '2026-03-05T10:05:00Z' },
    { id: 'todo-7', title: 'Buy revision stationery',          domainId: null,    dueDate: null,         priority: 'low',    done: true,  createdAt: '2026-03-04T09:00:00Z' },
    { id: 'todo-8', title: 'Submit SQL assignment',            domainId: 'cs302', dueDate: '2026-03-01', priority: 'high',   done: true,  createdAt: '2026-03-01T08:00:00Z' },
  ])

  const handleNavigate = (page) => {
    setPreviousPage(currentPage)
    setCurrentPage(page)
    if (page !== 'domain-detail') setSelectedDomain(null)
  }

  const handleOpenDomain = (domain) => {
    setPreviousPage(currentPage)
    setSelectedDomain(domain)
    setCurrentPage('domain-detail')
  }

  const handleBack = () => {
    setSelectedDomain(null)
    setCurrentPage(previousPage || 'domains')
    setPreviousPage(null)
  }

  const handleCreateDomain = (domain) => {
    setDomains(prev => [...prev, domain])
  }

  const handleAddCalendarEvent = (event) => {
    setCustomCalendarEvents(prev => [...prev, event])
  }

  const handleUpdateNote = (eventId, text) => {
    setEventNotes(prev => ({ ...prev, [eventId]: text }))
  }

  const handleAddTodo    = (todo) => setTodos(prev => [...prev, todo])
  const handleToggleTodo = (id)   => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const handleDeleteTodo = (id)   => setTodos(prev => prev.filter(t => t.id !== id))

  const handleAddNote = (note) => setNotes(prev => [...prev, note])
  const handleUpdateNoteData = (id, updates) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
  const handleDeleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id))

  // Called from DomainDetailPage — creates note, navigates, signals NotesPage to auto-open it
  const handleNewNoteForContext = (meta = {}) => {
    const id = `note-${Date.now()}`
    setNotes(prev => [...prev, {
      id, title: 'Untitled Note', strokes: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      domainId: meta.domainId || null,
      academicWeek: meta.academicWeek || null,
      eventId: meta.eventId || null,
      studySessionId: null,
    }])
    setNoteToOpen(id)
    handleNavigate('notes')
  }

  // Called from CalendarPage → EventDetailModal "View in Domains"
  const handleViewDomainById = (domainId) => {
    const domain = domains.find(d => d.id === domainId)
    if (domain) {
      setPreviousPage('calendar')
      setSelectedDomain(domain)
      setCurrentPage('domain-detail')
    }
  }

  // Linked custom events for a domain (from calendar)
  const linkedEventsFor = (domainId) =>
    customCalendarEvents.filter(ev => ev.domainId === domainId)

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate} theme={theme} onThemeChange={handleThemeChange}>
      {currentPage === 'domains' && (
        <DomainsPage
          domains={domains}
          customCalendarEvents={customCalendarEvents}
          todos={todos}
          onOpenDomain={handleOpenDomain}
          onCreateDomain={handleCreateDomain}
        />
      )}
      {currentPage === 'domain-detail' && selectedDomain && (
        <DomainDetailPage
          domain={selectedDomain}
          linkedEvents={linkedEventsFor(selectedDomain.id)}
          onBack={handleBack}
          eventNotes={eventNotes}
          onUpdateNote={handleUpdateNote}
          onNewNote={handleNewNoteForContext}
        />
      )}
      {currentPage === 'calendar' && (
        <CalendarPage
          domains={domains}
          customEvents={customCalendarEvents}
          onViewDomain={handleViewDomainById}
          onAddCalendarEvent={handleAddCalendarEvent}
          eventNotes={eventNotes}
          onUpdateNote={handleUpdateNote}
        />
      )}
      {currentPage === 'study' && <ComingSoon label="Study Session" />}
      {currentPage === 'notes' && (
        <NotesPage
          notes={notes}
          domains={domains}
          noteToOpen={noteToOpen}
          onClearNoteToOpen={() => setNoteToOpen(null)}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNoteData}
          onDeleteNote={handleDeleteNote}
        />
      )}
      {currentPage === 'todos' && (
        <TodosPage
          todos={todos}
          domains={domains}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
        />
      )}
    </Layout>
  )
}
