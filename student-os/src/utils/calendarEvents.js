import { subjects } from '../data/subjects'

// ─── Date parsing ─────────────────────────────────────────────────────────────
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function parseSubjectDate(dateStr) {
  const [day, mon, year] = dateStr.trim().split(' ')
  return new Date(parseInt(year), MONTH_SHORT.indexOf(mon), parseInt(day))
}

export function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// ─── Event type config ────────────────────────────────────────────────────────
export const EVENT_TYPES = {
  lecture:     { label: 'Lecture',     color: '#5b8cff' },
  lab:         { label: 'Lab',         color: '#a78bfa' },
  assignment:  { label: 'Deadline',    color: '#fbbf24' },
  exam:        { label: 'Exam',        color: '#fb7185' },
  study:       { label: 'Study',       color: '#34d399' },
  social:      { label: 'Social',      color: '#fb923c' },
  appointment: { label: 'Appointment', color: '#22d3ee' },
  reminder:    { label: 'Reminder',    color: '#f472b6' },
  other:       { label: 'Other',       color: '#9ca3af' },
}

// Priority order for rendering (high priority = shown first on crowded days)
export const TYPE_PRIORITY = ['exam', 'assignment', 'lab', 'lecture', 'study', 'social', 'appointment', 'reminder', 'other']

// Resolve the display label for any event (handles custom "Other" type names)
export function resolveTypeLabel(event) {
  if (event.type === 'other' && event.details?.customTypeName) return event.details.customTypeName
  return EVENT_TYPES[event.type]?.label || 'Event'
}

export function resolveTypeColor(event) {
  return EVENT_TYPES[event.type]?.color || '#9ca3af'
}

// ─── Derive events from subjects data ─────────────────────────────────────────
// GOOGLE CALENDAR HOOK: In the future, merge getSubjectEvents() output with
// events fetched from the Google Calendar API (after OAuth2 auth). The event
// shape below is designed to accommodate external events with subjectId: null.
export function getSubjectEvents() {
  const events = []

  subjects.forEach(subject => {
    subject.lectures.forEach((lecture, i) => {
      events.push({
        id: `${subject.id}-lecture-w${lecture.week}-${i}`,
        type: 'lecture',
        title: lecture.title,
        date: parseSubjectDate(lecture.date),
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        subjectColor: subject.color,
        details: {
          week: lecture.week,
          status: lecture.status,
          hasNotes: lecture.hasNotes,
        },
      })
    })

    subject.labs.forEach(lab => {
      events.push({
        id: `${subject.id}-${lab.id}`,
        type: 'lab',
        title: lab.title,
        date: parseSubjectDate(lab.date),
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        subjectColor: subject.color,
        details: {
          week: lab.week,
          status: lab.status,
        },
      })
    })

    subject.assignments.forEach(assignment => {
      events.push({
        id: `${subject.id}-${assignment.id}`,
        type: 'assignment',
        title: assignment.title,
        date: parseSubjectDate(assignment.dueDate),
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        subjectColor: subject.color,
        details: {
          weight: assignment.weight,
          status: assignment.status,
          grade: assignment.grade,
          assignmentId: assignment.id,
        },
      })
    })

    subject.exams.forEach(exam => {
      events.push({
        id: `${subject.id}-${exam.id}`,
        type: 'exam',
        title: exam.title,
        date: parseSubjectDate(exam.date),
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        subjectColor: subject.color,
        details: {
          time: exam.time,
          location: exam.location,
          weight: exam.weight,
          status: exam.status,
        },
      })
    })
  })

  return events
}

// ─── Calendar grid helpers ────────────────────────────────────────────────────
export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  // Monday-first offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7

  const days = []

  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }

  return days
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
