import { useState, useEffect, useRef, useMemo } from 'react'
import { getStoredTheme, applyTheme } from './theme'
import './App.css'
import Layout from './components/Layout'
import DomainsPage from './pages/DomainsPage'
import DomainDetailPage from './pages/DomainDetailPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import TodosPage from './pages/TodosPage'
import StudyPage, { FloatingTimerWidget, playChime, unlockAudio } from './pages/StudyPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import SettingsPage from './pages/SettingsPage'
import TutorialOverlay from './components/TutorialOverlay'
import { supabase } from './lib/supabase'
import { setSemesterConfig, getSemesterConfig } from './utils/semester'
import { buildScheduleEvents } from './utils/calendarEvents'

export default function App() {
  const [session,        setSession]        = useState(null)
  const [authLoading,    setAuthLoading]    = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)
  const [userProfile,    setUserProfile]    = useState(null)  // null = no profile yet

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) { setProfileChecked(false); setUserProfile(null) }
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
  const [domains,        setDomains]        = useState([])
  const [scheduleSlots,  setScheduleSlots]  = useState([])
  const [assessments,    setAssessments]    = useState([])
  const [customCalendarEvents, setCustomCalendarEvents] = useState([])
  const [eventNotes,    setEventNotes]    = useState({})
  const [notes,         setNotes]         = useState([])
  const [noteToOpen,    setNoteToOpen]    = useState(null)
  const [weekConfidence, setWeekConfidence] = useState({})
  const [todos,              setTodos]              = useState([])
  const [semConfig,          setSemConfig]          = useState(null)
  const [cancelledEventIds,  setCancelledEventIds]  = useState(() => new Set())
  const [eventTypeColors,    setEventTypeColors]    = useState({})

  const userId = session?.user?.id

  // Build semesterConfig shape from user_profiles + semester_breaks DB rows
  function buildSemesterConfig(profile, dbBreaks) {
    return {
      start: new Date(profile.semester_start + 'T00:00:00'),
      end:   new Date(profile.semester_end   + 'T00:00:00'),
      breaks: (dbBreaks || []).map(b => {
        const returnMon = new Date(b.return_monday + 'T00:00:00')
        const breakEnd  = new Date(returnMon)
        breakEnd.setDate(breakEnd.getDate() - 1)
        return {
          name:      b.name,
          shortName: b.name.split(' ')[0],
          color:     '#fbbf24',
          start:     new Date(b.start_monday + 'T00:00:00'),
          end:       breakEnd,
        }
      }),
    }
  }

  function dbDomainToLocal(r) {
    const color = r.color || '#5b8cff'
    return {
      id: r.id, name: r.name, code: r.code, category: r.category || 'academic',
      color, colorMuted: `${color}18`, icon: r.icon || 'BookOpen',
      professor: r.professor, credits: r.credits,
      semester: r.semester_label, description: r.description,
      role: r.role || null,
      progress: r.progress || 0,
    }
  }

  useEffect(() => {
    if (!userId) return

    // Check if user has completed onboarding
    supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserProfile(data)
          // Load semester breaks and build the dynamic semester config
          supabase.from('semester_breaks').select('*').eq('user_id', userId)
            .then(({ data: breaks }) => {
              const config = buildSemesterConfig(data, breaks || [])
              setSemesterConfig(config)  // Updates the semester utils module
              setSemConfig(config)
            })
        }
        setProfileChecked(true)
      })

    // Load domains from Supabase
    supabase.from('domains').select('*').eq('user_id', userId).order('created_at')
      .then(({ data }) => { if (data) setDomains(data.map(dbDomainToLocal)) })

    // Load schedule slots
    supabase.from('domain_schedule_slots').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data) setScheduleSlots(data.map(r => ({
          id: r.id, domainId: r.domain_id, dayOfWeek: r.day_of_week,
          startTime: r.start_time?.substring(0, 5) || r.start_time,
          durationMinutes: r.duration_minutes, slotType: r.slot_type,
          weekFrom: r.week_from ?? null, weekTo: r.week_to ?? null,
          location: r.location || null,
        })))
      })

    supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTodos(data.map(r => ({
          id: r.id, title: r.title, domainId: r.domain_id, dueDate: r.due_date,
          priority: r.priority, done: r.done, createdAt: r.created_at,
          studySessionId: r.study_session_id || null, noteId: r.note_id || null,
          academicWeek: r.academic_week || null,
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

    supabase.from('cancelled_schedule_events').select('event_id').eq('user_id', userId)
      .then(({ data }) => {
        if (data) setCancelledEventIds(new Set(data.map(r => r.event_id)))
      })

    supabase.from('user_preferences').select('event_type_colors').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data?.event_type_colors) setEventTypeColors(data.event_type_colors) })

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
          type: n.note_type || 'handwritten', content: n.content || '',
          template: n.template, bgColor: n.bg_color, lineSpacing: n.line_spacing,
          orientation: n.orientation, createdAt: n.created_at, updatedAt: n.updated_at,
          pages: (n.note_pages || []).sort((a, b) => a.page_order - b.page_order).map(p => ({
            id: p.id, strokes: p.strokes || [],
          })),
        })))
      })

    supabase.from('domain_assessments').select('*').eq('user_id', userId)
      .then(({ data }) => {
        if (data) setAssessments(data.map(r => ({
          id: r.id, domainId: r.domain_id, type: r.type,
          title: r.title, date: r.date, weight: r.weight,
          grade: r.grade ?? null, location: r.location ?? null,
          createdAt: r.created_at,
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

  // Auto-generated domain events from schedule slots + assessments
  const domainEvents = useMemo(() => {
    const domainMap = Object.fromEntries(domains.map(d => [d.id, d]))
    const schedEvents = buildScheduleEvents(domains, scheduleSlots, semConfig || getSemesterConfig())
      .filter(ev => !cancelledEventIds.has(ev.id))
    const assessEvents = assessments.map(a => {
      const d = domainMap[a.domainId]
      if (!d) return null
      const dateObj = a.date ? new Date(a.date + 'T12:00:00') : new Date()
      return {
        id: `assessment-${a.id}`,
        type: a.type,
        title: a.title,
        date: dateObj,
        domainId: a.domainId,
        domainCode: d.code,
        domainName: d.name,
        domainColor: d.color,
        domainIcon: d.icon,
        details: {
          weight: a.weight,
          grade: a.grade,
          location: a.location,
          status: a.grade != null ? 'graded' : dateObj < new Date() ? 'submitted' : 'upcoming',
        },
        assessmentId: a.id,
      }
    }).filter(Boolean)
    return [...schedEvents, ...assessEvents]
  }, [domains, scheduleSlots, semConfig, cancelledEventIds, assessments])

  const handleCompleteOnboarding = async ({ profile, semBreaks, domains: newDomains, slots }) => {
    const now = new Date().toISOString()

    // Save profile
    const { error: profErr } = await supabase.from('user_profiles').upsert({
      id: userId, ...profile, created_at: now, updated_at: now,
    })
    if (profErr) throw profErr

    // Save breaks
    if (semBreaks.length) {
      await supabase.from('semester_breaks').delete().eq('user_id', userId)
      const { error: brkErr } = await supabase.from('semester_breaks').insert(
        semBreaks.map(b => ({ id: crypto.randomUUID(), user_id: userId, name: b.name, start_monday: b.startMonday, return_monday: b.returnMonday }))
      )
      if (brkErr) throw brkErr
    }

    // Save domains
    if (newDomains.length) {
      const { error: domErr } = await supabase.from('domains').insert(
        newDomains.map(d => ({
          id: d.id, user_id: userId, name: d.name, code: d.code || null,
          category: d.category, color: d.color, icon: d.icon || 'BookOpen',
          professor: d.professor || null, credits: d.credits || null,
          progress: 0, created_at: now, updated_at: now,
        }))
      )
      if (domErr) throw domErr
      setDomains(newDomains.map(d => ({ ...d, lectures:[], labs:[], assignments:[], exams:[] })))
    }

    // Save schedule slots
    if (slots.length) {
      const { error: slotErr } = await supabase.from('domain_schedule_slots').insert(
        slots.map(s => ({
          id: s.id, user_id: userId, domain_id: s.domainId,
          day_of_week: s.dayOfWeek, start_time: s.startTime,
          duration_minutes: s.durationMinutes, slot_type: s.slotType,
          week_from: s.weekFrom ?? null, week_to: s.weekTo ?? null,
          location: s.location || null,
        }))
      )
      if (slotErr) throw slotErr
      setScheduleSlots(slots)
    }

    // Apply semester config to utils
    const config = buildSemesterConfig(profile, semBreaks.map(b => ({
      ...b, start_monday: b.startMonday, return_monday: b.returnMonday,
    })))
    setSemesterConfig(config)
    setSemConfig(config)
    setUserProfile(profile)
    setTutorialStep(0)
  }

  const handleCreateDomain = (domain) => {
    const now = new Date().toISOString()
    const withDefaults = { ...domain, lectures:[], labs:[], assignments:[], exams:[] }
    setDomains(prev => [...prev, withDefaults])
    supabase.from('domains').insert({
      id: domain.id, user_id: userId, name: domain.name, code: domain.code || null,
      category: domain.category, color: domain.color, icon: domain.icon || 'BookOpen',
      professor: domain.professor || null, credits: domain.credits || null,
      progress: 0, created_at: now, updated_at: now,
    })
  }

  const handleUpdateDomain = (id, updates) => {
    setDomains(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    setSelectedDomain(prev => prev?.id === id ? { ...prev, ...updates } : prev)
    supabase.from('domains').update({
      name: updates.name, code: updates.code, icon: updates.icon,
      color: updates.color, description: updates.description ?? null,
      professor: updates.professor ?? null, credits: updates.credits ?? null,
      semester_label: updates.semester ?? null, role: updates.role ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).then(({ error }) => {
      if (error) console.error('Domain update failed:', error)
    })
  }

  const handleAddAssessment = async (assessment) => {
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    const item = { ...assessment, id, grade: null, createdAt: now }
    setAssessments(prev => [...prev, item])
    const { error } = await supabase.from('domain_assessments').insert({
      id, user_id: userId, domain_id: assessment.domainId,
      type: assessment.type, title: assessment.title,
      date: assessment.date || null, weight: assessment.weight || 0,
      grade: null, location: assessment.location || null,
      created_at: now,
    })
    if (error) setAssessments(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  const handleUpdateAssessment = async (id, updates) => {
    const snapshot = assessments.slice()
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    const { error } = await supabase.from('domain_assessments').update({
      title: updates.title,
      date: updates.date ?? null,
      weight: updates.weight ?? 0,
      grade: updates.grade ?? null,
      location: updates.location ?? null,
    }).eq('id', id)
    if (error) setAssessments(snapshot)
    return { error }
  }

  const handleDeleteAssessment = async (id) => {
    const snapshot = assessments.slice()
    setAssessments(prev => prev.filter(a => a.id !== id))
    const { error } = await supabase.from('domain_assessments').delete().eq('id', id)
    if (error) setAssessments(snapshot)
    return { error }
  }

  const handleDeleteCalendarEvent = (id) => {
    setCustomCalendarEvents(prev => prev.filter(ev => ev.id !== id))
    supabase.from('custom_calendar_events').delete().eq('id', id)
  }

  const handleCancelScheduleEvent = (eventId) => {
    setCancelledEventIds(prev => new Set([...prev, eventId]))
    supabase.from('cancelled_schedule_events').insert({ user_id: userId, event_id: eventId })
  }

  const handleUpdateEventTypeColor = (type, color) => {
    setEventTypeColors(prev => {
      const next = { ...prev, [type]: color }
      supabase.from('user_preferences').upsert(
        { user_id: userId, event_type_colors: next },
        { onConflict: 'user_id' }
      )
      return next
    })
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
    supabase.from('todos').upsert({
      id, user_id: userId, title: todo.title, domain_id: todo.domainId || null,
      due_date: todo.dueDate || null, priority: todo.priority, done: false, created_at: now,
      study_session_id: todo.studySessionId || null, note_id: todo.noteId || null,
      academic_week: todo.academicWeek || null,
    }, { onConflict: 'id' })
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

  const handleUpdateTodo = (id, updates) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const db = {}
    if ('title'          in updates) db.title            = updates.title
    if ('domainId'       in updates) db.domain_id        = updates.domainId || null
    if ('dueDate'        in updates) db.due_date         = updates.dueDate || null
    if ('priority'       in updates) db.priority         = updates.priority
    if ('academicWeek'   in updates) db.academic_week    = updates.academicWeek || null
    if ('noteId'         in updates) db.note_id          = updates.noteId || null
    if ('studySessionId' in updates) db.study_session_id = updates.studySessionId || null
    supabase.from('todos').update(db).eq('id', id)
  }

  const [tutorialStep, setTutorialStep] = useState(null)

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
    unlockAudio()
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
        study_session_id: null, event_id: null,
        template: newNote.template, bg_color: newNote.bgColor,
        line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
        note_type: 'handwritten', content: null,
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
    }).then(() => {
      if (activeSession.noteId) {
        supabase.from('notes').update({ study_session_id: record.id }).eq('id', activeSession.noteId)
      }
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
    const id      = note.id || crypto.randomUUID()
    const now     = new Date().toISOString()
    const isTyped = note.type === 'typed'
    const pageId  = isTyped ? null : crypto.randomUUID()
    const newNote = { ...note, id, pages: isTyped ? [] : [{ id: pageId, strokes: [] }], createdAt: now, updatedAt: now }
    setNotes(prev => [...prev, newNote])
    supabase.from('notes').upsert({
      id, user_id: userId, title: newNote.title, domain_id: newNote.domainId || null,
      academic_week: newNote.academicWeek || null, event_id: newNote.eventId || null,
      study_session_id: null, template: newNote.template, bg_color: newNote.bgColor,
      line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
      note_type: newNote.type || 'handwritten', content: newNote.content || null,
      created_at: now, updated_at: now,
    }, { onConflict: 'id' }).then(() => {
      if (!isTyped && pageId) supabase.from('note_pages').upsert({ note_id: id, page_order: 0, strokes: [] }, { onConflict: 'note_id,page_order' })
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

    if (note.type === 'typed') {
      const { error } = await supabase.from('notes').update({
        title: note.title, content: note.content || null, updated_at: now,
      }).eq('id', noteId)
      if (error) { console.error('notes update failed:', error); throw error }
    } else {
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
    }

    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, updatedAt: now } : n))
  }

  // Called from DomainDetailPage — creates note, navigates, signals NotesPage to auto-open it
  const handleNewNoteForContext = (meta = {}) => {
    const isTyped = meta.noteType === 'typed'
    const id      = crypto.randomUUID()
    const pageId  = crypto.randomUUID()
    const now     = new Date().toISOString()
    const title   = meta.title || 'Untitled Note'
    const newNote = {
      id, title, type: isTyped ? 'typed' : 'handwritten',
      content: isTyped ? '' : null,
      pages: isTyped ? [] : [{ id: pageId, strokes: [] }],
      template: 'blank', bgColor: '#f8f7f2', lineSpacing: 32, orientation: 'portrait',
      createdAt: now, updatedAt: now,
      domainId: meta.domainId || null, academicWeek: meta.academicWeek || null,
      eventId: meta.eventId || null, studySessionId: null,
    }
    setNotes(prev => [...prev, newNote])
    supabase.from('notes').upsert({
      id, user_id: userId, title, domain_id: newNote.domainId,
      academic_week: newNote.academicWeek, event_id: newNote.eventId,
      study_session_id: null, template: newNote.template, bg_color: newNote.bgColor,
      line_spacing: newNote.lineSpacing, orientation: newNote.orientation,
      note_type: newNote.type, content: isTyped ? '' : null,
      created_at: now, updated_at: now,
    }, { onConflict: 'id' }).then(() => {
      if (!isTyped) supabase.from('note_pages').upsert({ note_id: id, page_order: 0, strokes: [] }, { onConflict: 'note_id,page_order' })
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

  const handleUpdateProfile = async (updates) => {
    const { error } = await supabase.from('user_profiles').update({
      ...updates, updated_at: new Date().toISOString(),
    }).eq('id', userId)
    if (!error) setUserProfile(prev => ({ ...prev, ...updates }))
    return { error }
  }

  const handleChangePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const handleDevResetOnboarding = async () => {
    if (!userId) return
    await Promise.all([
      supabase.from('notes').delete().eq('user_id', userId),
      supabase.from('todos').delete().eq('user_id', userId),
      supabase.from('custom_calendar_events').delete().eq('user_id', userId),
      supabase.from('cancelled_schedule_events').delete().eq('user_id', userId),
      supabase.from('event_notes').delete().eq('user_id', userId),
      supabase.from('week_confidence').delete().eq('user_id', userId),
      supabase.from('study_sessions').delete().eq('user_id', userId),
      supabase.from('domain_schedule_slots').delete().eq('user_id', userId),
      supabase.from('semester_breaks').delete().eq('user_id', userId),
      supabase.from('domain_assessments').delete().eq('user_id', userId),
      supabase.from('domains').delete().eq('user_id', userId),
      supabase.from('user_profiles').delete().eq('id', userId),
      supabase.from('user_preferences').delete().eq('user_id', userId),
    ])
    setUserProfile(null)
    setDomains([])
    setScheduleSlots([])
    setSemConfig(null)
    setTodos([])
    setStudySessions([])
    setCustomCalendarEvents([])
    setCancelledEventIds(new Set())
    setEventNotes({})
    setWeekConfidence({})
    setNotes([])
    setEventTypeColors({})
    setAssessments([])
    setCurrentPage('domains')
  }

  if (authLoading) return null
  if (!session) return <AuthPage />
  if (!profileChecked) return null
  if (!userProfile) return <OnboardingPage userId={userId} onComplete={handleCompleteOnboarding} />

  return (
    <>
    <Layout currentPage={currentPage} onNavigate={handleNavigate} onSignOut={() => supabase.auth.signOut()} onStartTutorial={() => setTutorialStep(0)}>
      {currentPage === 'domains' && (
        <DomainsPage
          domains={domains}
          customCalendarEvents={customCalendarEvents}
          todos={todos}
          assessments={assessments}
          domainEvents={domainEvents}
          onOpenDomain={handleOpenDomain}
          onCreateDomain={handleCreateDomain}
        />
      )}
      {currentPage === 'domain-detail' && selectedDomain && (
        <DomainDetailPage
          domain={selectedDomain}
          domainEvents={domainEvents.filter(e => e.domainId === selectedDomain.id)}
          linkedEvents={linkedEventsFor(selectedDomain.id)}
          onBack={handleBack}
          eventNotes={eventNotes}
          onUpdateNote={handleUpdateNote}
          onNewNote={handleNewNoteForContext}
          onUpdateDomain={handleUpdateDomain}
          studySessions={studySessions}
          notes={notes}
          weekConfidence={weekConfidence}
          onSetWeekConfidence={handleSetWeekConfidence}
          onOpenNote={handleOpenNoteFromSession}
          assessments={assessments.filter(a => a.domainId === selectedDomain.id)}
          onAddAssessment={handleAddAssessment}
          onUpdateAssessment={handleUpdateAssessment}
          onDeleteAssessment={handleDeleteAssessment}
        />
      )}
      {currentPage === 'calendar' && (
        <CalendarPage
          domains={domains}
          domainEvents={domainEvents}
          customEvents={customCalendarEvents}
          onViewDomain={handleViewDomainById}
          onAddCalendarEvent={handleAddCalendarEvent}
          onDeleteCalendarEvent={handleDeleteCalendarEvent}
          onCancelScheduleEvent={handleCancelScheduleEvent}
          eventNotes={eventNotes}
          onUpdateNote={handleUpdateNote}
          eventTypeColors={eventTypeColors}
          onUpdateEventTypeColor={handleUpdateEventTypeColor}
          isTutorial={tutorialStep !== null}
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
          isTutorial={tutorialStep !== null}
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
          notes={notes}
          studySessions={studySessions}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onUpdateTodo={handleUpdateTodo}
          onOpenNote={handleOpenNoteFromSession}
          isTutorial={tutorialStep !== null}
        />
      )}
      {currentPage === 'settings' && (
        <SettingsPage
          userProfile={userProfile}
          userEmail={session?.user?.email || ''}
          theme={theme}
          onThemeChange={handleThemeChange}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onResetOnboarding={handleDevResetOnboarding}
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
    {tutorialStep !== null && (
      <TutorialOverlay
        userName={userProfile?.first_name || ''}
        stepIndex={tutorialStep}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAdvance={setTutorialStep}
        onClose={() => setTutorialStep(null)}
      />
    )}
    </>
  )
}
