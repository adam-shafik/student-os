import { useState, useEffect, useRef } from 'react'
import { getStoredTheme, applyTheme } from './theme'
import './App.css'
import Layout from './components/Layout'
import DomainsPage from './pages/DomainsPage'
import DomainDetailPage from './pages/DomainDetailPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import TodosPage from './pages/TodosPage'
import StudyPage, { FloatingTimerWidget, playChime } from './pages/StudyPage'
import AuthPage from './pages/AuthPage'
import { initialDomains } from './data/domains'
import { supabase } from './lib/supabase'

export default function App() {
  const [session,     setSession]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

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
  const [weekConfidence, setWeekConfidence] = useState({})
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

  const handleSetWeekConfidence = (domainId, week, level) =>
    setWeekConfidence(prev => ({ ...prev, [domainId]: { ...(prev[domainId] || {}), [week]: level } }))

  const handleAddTodo    = (todo) => setTodos(prev => [...prev, todo])
  const handleToggleTodo = (id)   => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const handleDeleteTodo = (id)   => setTodos(prev => prev.filter(t => t.id !== id))

  const [studySessions, setStudySessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [soundEnabled,  setSoundEnabled]  = useState(true)
  const soundEnabledRef = useRef(true)
  soundEnabledRef.current = soundEnabled

  // Countdown — fires every second while running
  useEffect(() => {
    if (!activeSession?.isRunning || activeSession.phase === 'done' || activeSession.secondsLeft <= 0) return
    const id = setTimeout(() => {
      setActiveSession(prev => prev?.isRunning ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : prev)
    }, 1000)
    return () => clearTimeout(id)
  }, [activeSession?.secondsLeft, activeSession?.isRunning])

  // Phase transition when secondsLeft hits 0
  useEffect(() => {
    if (!activeSession || activeSession.secondsLeft !== 0 || activeSession.phase === 'done') return
    if (soundEnabledRef.current) playChime()
    setActiveSession(prev => {
      if (!prev || prev.secondsLeft !== 0 || prev.phase === 'done') return prev
      if (prev.phase === 'work') {
        const roundsCompleted = prev.roundsCompleted + 1
        if (roundsCompleted >= prev.totalRounds) {
          return { ...prev, phase: 'done', isRunning: false, roundsCompleted }
        }
        return { ...prev, phase: 'break', secondsLeft: prev.pomodoroBreak * 60, roundsCompleted }
      }
      return { ...prev, phase: 'work', secondsLeft: prev.pomodoroWork * 60, currentRound: prev.currentRound + 1 }
    })
  }, [activeSession?.secondsLeft])

  const handleStartSession = ({ domainId, topic, academicWeek, pomodoroWork, pomodoroBreak, totalRounds, withNote }) => {
    const ts        = Date.now()
    const sessionId = `session-${ts}`
    let noteId      = null
    if (withNote) {
      noteId = `note-study-${ts}`
      const domain = domains.find(d => d.id === domainId)
      setNotes(prev => [...prev, {
        id: noteId,
        title: topic || `Study Session`,
        pages: [{ id: `page-${ts}`, strokes: [] }],
        template: 'lined', bgColor: '#f8f7f2', lineSpacing: 32, orientation: 'portrait',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        domainId: domainId || null, academicWeek: academicWeek || null,
        eventId: null, studySessionId: sessionId,
      }])
      setNoteToOpen(noteId)
      handleNavigate('notes')
    }
    setActiveSession({
      id: sessionId, domainId, topic, academicWeek,
      pomodoroWork, pomodoroBreak, totalRounds, noteId,
      phase: 'work', currentRound: 1, roundsCompleted: 0,
      secondsLeft: pomodoroWork * 60, isRunning: true,
      widgetHidden: false, widgetBlurred: false,
      startedAt: new Date().toISOString(),
    })
  }

  const handleEndSession = () => {
    if (!activeSession) return
    setStudySessions(prev => [{
      id: activeSession.id, domainId: activeSession.domainId, topic: activeSession.topic,
      academicWeek: activeSession.academicWeek, pomodoroWork: activeSession.pomodoroWork,
      pomodoroBreak: activeSession.pomodoroBreak, totalRounds: activeSession.totalRounds,
      roundsCompleted: activeSession.roundsCompleted, noteId: activeSession.noteId,
      status: activeSession.phase === 'done' ? 'completed' : 'abandoned',
      startedAt: activeSession.startedAt, endedAt: new Date().toISOString(),
    }, ...prev])
    setActiveSession(null)
  }

  const handlePauseResume = () =>
    setActiveSession(prev => prev ? { ...prev, isRunning: !prev.isRunning } : null)

  const handleSkipPhase = () =>
    setActiveSession(prev => {
      if (!prev) return null
      if (prev.phase === 'work') {
        const roundsCompleted = prev.roundsCompleted + 1
        if (roundsCompleted >= prev.totalRounds)
          return { ...prev, phase: 'done', isRunning: false, roundsCompleted, secondsLeft: 0 }
        return { ...prev, phase: 'break', secondsLeft: prev.pomodoroBreak * 60, roundsCompleted }
      }
      return { ...prev, phase: 'work', secondsLeft: prev.pomodoroWork * 60, currentRound: prev.currentRound + 1 }
    })

  const handleToggleWidgetHidden  = () => setActiveSession(prev => prev ? { ...prev, widgetHidden:  !prev.widgetHidden  } : null)
  const handleToggleWidgetBlurred = () => setActiveSession(prev => prev ? { ...prev, widgetBlurred: !prev.widgetBlurred } : null)

  const handleOpenNoteFromSession = (noteId) => {
    if (!noteId) return
    setNoteToOpen(noteId)
    handleNavigate('notes')
  }

  const handleAddNote = (note) => setNotes(prev => [...prev, note])
  const handleUpdateNoteData = (id, updates) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
  const handleDeleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id))

  // Called from DomainDetailPage — creates note, navigates, signals NotesPage to auto-open it
  const handleNewNoteForContext = (meta = {}) => {
    const id = `note-${Date.now()}`
    setNotes(prev => [...prev, {
      id, title: 'Untitled Note',
      pages: [{ id: `page-${Date.now()}`, strokes: [] }],
      template: 'blank', bgColor: '#f8f7f2', lineSpacing: 32, orientation: 'portrait',
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

  if (authLoading) return null
  if (!session) return <AuthPage />

  return (
    <>
    <Layout currentPage={currentPage} onNavigate={handleNavigate} theme={theme} onThemeChange={handleThemeChange} onSignOut={() => supabase.auth.signOut()}>
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
          studySessions={studySessions}
          notes={notes}
          weekConfidence={weekConfidence}
          onSetWeekConfidence={handleSetWeekConfidence}
          onOpenNote={handleOpenNoteFromSession}
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
      {currentPage === 'study' && (
        <StudyPage
          domains={domains}
          studySessions={studySessions}
          activeSession={activeSession}
          onStartSession={handleStartSession}
          onEndSession={handleEndSession}
          onPauseResume={handlePauseResume}
          onSkipPhase={handleSkipPhase}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(v => !v)}
          onOpenNote={handleOpenNoteFromSession}
        />
      )}
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
    {activeSession && currentPage !== 'study' && (
      <FloatingTimerWidget
        session={activeSession}
        domain={domains.find(d => d.id === activeSession.domainId)}
        onPauseResume={handlePauseResume}
        onSkipPhase={handleSkipPhase}
        onGoToStudy={() => handleNavigate('study')}
        onToggleHidden={handleToggleWidgetHidden}
        onToggleBlurred={handleToggleWidgetBlurred}
      />
    )}
    </>
  )
}
