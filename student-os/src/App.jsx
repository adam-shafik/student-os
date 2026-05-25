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
  const [todos,         setTodos]         = useState([])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return

    supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTodos(data.map(r => ({
          id: r.id, title: r.title, domainId: r.domain_id, dueDate: r.due_date,
          priority: r.priority, done: r.done, createdAt: r.created_at,
        })))
      })

    supabase.from('custom_calendar_events').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data) setCustomCalendarEvents(data.map(r => ({
          id: r.id, type: r.type, title: r.title,
          date: new Date(r.date + 'T00:00:00'),
          domainId: r.domain_id, academicWeek: r.academic_week,
        })))
      })

    supabase.from('event_notes').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(r => { map[r.event_id] = r.text })
          setEventNotes(map)
        }
      })

    supabase.from('week_confidence').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(r => {
            if (!map[r.domain_id]) map[r.domain_id] = {}
            map[r.domain_id][r.week] = r.status
          })
          setWeekConfidence(map)
        }
      })

    supabase.from('study_sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false })
      .then(({ data }) => {
        if (data) setStudySessions(data.map(r => ({
          id: r.id, domainId: r.domain_id, topic: r.topic,
          academicWeek: r.academic_week, pomodoroWork: r.pomodoro_work,
          pomodoroBreak: r.pomodoro_break, totalRounds: r.total_rounds,
          roundsCompleted: r.rounds_completed, noteId: r.note_id,
          status: r.status, startedAt: r.started_at, endedAt: r.ended_at,
        })))
      })

    supabase.from('notes').select('*, note_pages(id, page_order, strokes)').eq('user_id', userId).order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotes(data.map(n => ({
          id: n.id, title: n.title, domainId: n.domain_id, academicWeek: n.academic_week,
          eventId: n.event_id, studySessionId: n.study_session_id,
          template: n.template, bgColor: n.bg_color, lineSpacing: n.line_spacing,
          orientation: n.orientation, createdAt: n.created_at, updatedAt: n.updated_at,
          pages: (n.note_pages || []).sort((a, b) => a.page_order - b.page_order).map(p => ({
            id: p.id, strokes: p.strokes || [],
          })),
        })))
      })
  }, [userId])

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
    const id = crypto.randomUUID()
    setCustomCalendarEvents(prev => [...prev, { ...event, id }])
    const d = event.date
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    supabase.from('custom_calendar_events').insert({
      id, user_id: userId, type: event.type, title: event.title,
      date: dateStr, domain_id: event.domainId || null, academic_week: event.academicWeek || null,
    })
  }

  const handleUpdateNote = (eventId, text) => {
    setEventNotes(prev => ({ ...prev, [eventId]: text }))
    supabase.from('event_notes').upsert(
      { user_id: userId, event_id: eventId, text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,event_id' }
    )
  }

  const handleSetWeekConfidence = (domainId, week, level) => {
    setWeekConfidence(prev => ({ ...prev, [domainId]: { ...(prev[domainId] || {}), [week]: level } }))
    supabase.from('week_confidence').upsert(
      { user_id: userId, domain_id: domainId, week, status: level },
      { onConflict: 'user_id,domain_id,week' }
    )
  }

  const handleAddTodo = (todo) => {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    setTodos(prev => [...prev, { ...todo, id, createdAt: now }])
    supabase.from('todos').insert({
      id, user_id: userId, title: todo.title, domain_id: todo.domainId || null,
      due_date: todo.dueDate || null, priority: todo.priority, done: false, created_at: now,
    })
  }

  const handleToggleTodo = (id) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t
      supabase.from('todos').update({ done: !t.done }).eq('id', id)
      return { ...t, done: !t.done }
    }))
  }

  const handleDeleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    supabase.from('todos').delete().eq('id', id)
  }

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
    const sessionId = crypto.randomUUID()
    let noteId      = null
    if (withNote) {
      noteId = crypto.randomUUID()
      const pageId  = crypto.randomUUID()
      const now     = new Date().toISOString()
      const newNote = {
        id: noteId, title: topic || 'Study Session',
        pages: [{ id: pageId, strokes: [] }],
        template: 'lined', bgColor: '#f8f7f2', lineSpacing: 32, orientation: 'portrait',
        createdAt: now, updatedAt: now,
        domainId: domainId || null, academicWeek: academicWeek || null,
        eventId: null, studySessionId: sessionId,
      }
      setNotes(prev => [...prev, newNote])
      supabase.from('notes').insert({
        id: noteId, user_id: userId, title: newNote.title,
        domain_id: newNote.domainId, academic_week: newNote.academicWeek,
        study_session_id: sessionId, event_id: null,
        template: newNote.template, bg_color: newNote.bgColor,
        line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
        created_at: now, updated_at: now,
      }).then(() => {
        supabase.from('note_pages').insert({ note_id: noteId, page_order: 0, strokes: [] })
      })
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
    const endedAt = new Date().toISOString()
    const record  = {
      id: activeSession.id, domainId: activeSession.domainId, topic: activeSession.topic,
      academicWeek: activeSession.academicWeek, pomodoroWork: activeSession.pomodoroWork,
      pomodoroBreak: activeSession.pomodoroBreak, totalRounds: activeSession.totalRounds,
      roundsCompleted: activeSession.roundsCompleted, noteId: activeSession.noteId,
      status: activeSession.phase === 'done' ? 'completed' : 'abandoned',
      startedAt: activeSession.startedAt, endedAt,
    }
    setStudySessions(prev => [record, ...prev])
    supabase.from('study_sessions').insert({
      id: record.id, user_id: userId, domain_id: record.domainId, topic: record.topic,
      academic_week: record.academicWeek, pomodoro_work: record.pomodoroWork,
      pomodoro_break: record.pomodoroBreak, total_rounds: record.totalRounds,
      rounds_completed: record.roundsCompleted, note_id: record.noteId,
      status: record.status, started_at: record.startedAt, ended_at: endedAt,
    })
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

  const handleAddNote = (note) => {
    const id     = crypto.randomUUID()
    const pageId = crypto.randomUUID()
    const now    = new Date().toISOString()
    const newNote = { ...note, id, pages: [{ id: pageId, strokes: [] }], createdAt: now, updatedAt: now }
    setNotes(prev => [...prev, newNote])
    supabase.from('notes').insert({
      id, user_id: userId, title: newNote.title, domain_id: newNote.domainId || null,
      academic_week: newNote.academicWeek || null, event_id: newNote.eventId || null,
      study_session_id: null, template: newNote.template, bg_color: newNote.bgColor,
      line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
      created_at: now, updated_at: now,
    }).then(() => {
      supabase.from('note_pages').insert({ note_id: id, page_order: 0, strokes: [] })
    })
  }

  const handleUpdateNoteData = (id, updates) =>
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))

  const handleDeleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    supabase.from('notes').delete().eq('id', id)  // note_pages cascade deletes
  }

  const handleSaveNote = async (noteId) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const now = new Date().toISOString()

    const { error: updateErr } = await supabase.from('notes').update({
      title: note.title, template: note.template, bg_color: note.bgColor,
      line_spacing: note.lineSpacing, orientation: note.orientation, updated_at: now,
    }).eq('id', noteId)
    if (updateErr) { console.error('notes update failed:', updateErr); throw updateErr }

    const { error: deleteErr } = await supabase.from('note_pages').delete().eq('note_id', noteId)
    if (deleteErr) { console.error('note_pages delete failed:', deleteErr); throw deleteErr }

    if (note.pages.length > 0) {
      const { error: insertErr } = await supabase.from('note_pages').insert(
        note.pages.map((p, i) => ({ note_id: noteId, page_order: i, strokes: p.strokes }))
      )
      if (insertErr) { console.error('note_pages insert failed:', insertErr); throw insertErr }
    }

    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, updatedAt: now } : n))
  }

  // Called from DomainDetailPage — creates note, navigates, signals NotesPage to auto-open it
  const handleNewNoteForContext = (meta = {}) => {
    const id     = crypto.randomUUID()
    const pageId = crypto.randomUUID()
    const now    = new Date().toISOString()
    const newNote = {
      id, title: 'Untitled Note',
      pages: [{ id: pageId, strokes: [] }],
      template: 'blank', bgColor: '#f8f7f2', lineSpacing: 32, orientation: 'portrait',
      createdAt: now, updatedAt: now,
      domainId: meta.domainId || null, academicWeek: meta.academicWeek || null,
      eventId: meta.eventId || null, studySessionId: null,
    }
    setNotes(prev => [...prev, newNote])
    supabase.from('notes').insert({
      id, user_id: userId, title: newNote.title, domain_id: newNote.domainId,
      academic_week: newNote.academicWeek, event_id: newNote.eventId,
      study_session_id: null, template: newNote.template, bg_color: newNote.bgColor,
      line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
      created_at: now, updated_at: now,
    }).then(() => {
      supabase.from('note_pages').insert({ note_id: id, page_order: 0, strokes: [] })
    })
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
          onSaveNote={handleSaveNote}
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
