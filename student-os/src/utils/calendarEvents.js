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
  lecture:     { label: 'Lecture',       color: '#5b8cff' },
  lab:         { label: 'Lab',           color: '#a78bfa' },
  tutorial:    { label: 'Tutorial',      color: '#4ade80' },
  seminar:     { label: 'Seminar',       color: '#fb923c' },
  workshop:    { label: 'Workshop',      color: '#38bdf8' },
  group:       { label: 'Group Meeting', color: '#e879f9' },
  assignment:  { label: 'Deadline',      color: '#fbbf24' },
  exam:        { label: 'Exam',          color: '#fb7185' },
  study:       { label: 'Study',         color: '#34d399' },
  social:      { label: 'Social',        color: '#fb923c' },
  appointment: { label: 'Appointment',   color: '#22d3ee' },
  reminder:    { label: 'Reminder',      color: '#f472b6' },
  other:       { label: 'Other',         color: '#9ca3af' },
}

// Priority order for rendering (high priority = shown first on crowded days)
export const TYPE_PRIORITY = ['exam', 'assignment', 'lab', 'lecture', 'tutorial', 'seminar', 'workshop', 'group', 'study', 'social', 'appointment', 'reminder', 'other']

// Resolve the display label for any event (handles custom "Other" type names)
export function resolveTypeLabel(event) {
  if (event.type === 'other' && event.details?.customTypeName) return event.details.customTypeName
  return EVENT_TYPES[event.type]?.label || 'Event'
}

export function resolveTypeColor(event, customColors = {}) {
  return customColors[event.type] || EVENT_TYPES[event.type]?.color || '#9ca3af'
}

export function getTypeColor(type, customColors = {}) {
  return customColors[type] || EVENT_TYPES[type]?.color || '#9ca3af'
}

// ─── Build schedule events from user's weekly slots + semester config ─────────
// Generates a lecture/lab event for every teaching week based on slots set in onboarding.
// GOOGLE CALENDAR HOOK: In the future, merge this output with events from the Google
// Calendar API (after OAuth2 auth). The event shape is designed to accommodate external
// events with domainId: null.
export function buildScheduleEvents(domains, scheduleSlots, config) {
  if (!domains?.length || !scheduleSlots?.length || !config) return []

  const { start, end, breaks } = config
  const events     = []
  const domainMap  = Object.fromEntries(domains.map(d => [d.id, d]))
  const d0         = date => { const n = new Date(date); n.setHours(0,0,0,0); return n }
  const semStart   = d0(start)
  const semEnd     = d0(end)

  let weekMonday = new Date(semStart)
  let weekNum    = 1

  while (weekMonday <= semEnd) {
    const wednesday = new Date(weekMonday)
    wednesday.setDate(wednesday.getDate() + 2)

    const inBreak = breaks.some(b => {
      const bs = d0(b.start)
      const be = d0(b.end)
      return wednesday >= bs && wednesday <= be
    })

    if (!inBreak) {
      for (const slot of scheduleSlots) {
        const domain = domainMap[slot.domainId]
        if (!domain) continue
        if (slot.weekFrom != null && weekNum < slot.weekFrom) continue
        if (slot.weekTo   != null && weekNum > slot.weekTo)   continue

        const eventDate = new Date(weekMonday)
        eventDate.setDate(eventDate.getDate() + slot.dayOfWeek) // 0=Mon…4=Fri

        if (eventDate > semEnd) continue

        events.push({
          id: `schedule-${slot.id}-w${weekNum}`,
          type: slot.slotType,
          title: domain.name,
          date: eventDate,
          domainId: domain.id,
          domainCode: domain.code,
          domainName: domain.name,
          domainColor: domain.color,
          domainIcon: domain.icon || 'BookOpen',
          details: {
            week: weekNum,
            time: slot.startTime,
            duration: slot.durationMinutes,
            status: 'upcoming',
            location: slot.location || null,
          },
        })
      }
      weekNum++
    }

    weekMonday = new Date(weekMonday)
    weekMonday.setDate(weekMonday.getDate() + 7)
  }

  return events
}

// Legacy no-op — replaced by buildScheduleEvents
export function getDomainEvents() { return [] }
export const getSubjectEvents = getDomainEvents

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
