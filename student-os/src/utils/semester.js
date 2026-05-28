import { semesterConfig as _defaultConfig } from '../data/semester'

const MS = 86400000
const d0 = date => { const n = new Date(date); n.setHours(0, 0, 0, 0); return n }

// Module-level config — updated by App.jsx once user profile is loaded from DB
let _config = _defaultConfig
export function setSemesterConfig(config) { _config = config }
export function getSemesterConfig() { return _config }

export function isInSemester(date) {
  const d = d0(date)
  return d >= d0(_config.start) && d <= d0(_config.end)
}

export function getBreakForDate(date) {
  const d = d0(date)
  return _config.breaks.find(b => d >= d0(b.start) && d <= d0(b.end)) || null
}

// Returns academic teaching week number (1-based) or null if outside semester / in break
export function getAcademicWeek(date) {
  const d = d0(date)
  if (!isInSemester(d) || getBreakForDate(d)) return null

  const semStart = d0(_config.start)

  // Count break days that fall strictly before d
  let breakDays = 0
  for (const brk of _config.breaks) {
    const bStart = d0(brk.start)
    const bEnd   = d0(brk.end)
    if (bStart < d) {
      const effectiveEnd = bEnd < d ? bEnd : new Date(d - MS)
      if (effectiveEnd >= bStart)
        breakDays += Math.round((effectiveEnd - bStart) / MS) + 1
    }
  }

  const daysSinceStart = Math.round((d - semStart) / MS)
  return Math.floor((daysSinceStart - breakDays) / 7) + 1
}

// Total number of teaching weeks in the semester
export function totalTeachingWeeks() {
  const { start, end, breaks } = _config
  const totalDays = Math.round((d0(end) - d0(start)) / MS) + 1
  const breakDays = breaks.reduce((sum, b) => {
    return sum + Math.round((d0(b.end) - d0(b.start)) / MS) + 1
  }, 0)
  return Math.ceil((totalDays - breakDays) / 7)
}

// Given a calendar week row (array of day objects with .date), return display info
export function getWeekRowInfo(weekDays, weekStartSunday = false) {
  const dates = weekDays.map(wd => wd.date)
  // Wednesday: Mon-first row = index 2, Sun-first row = index 3
  const probe = dates[weekStartSunday ? 3 : 2] || dates[0]

  if (probe) {
    if (isInSemester(probe)) {
      const brk = getBreakForDate(probe)
      if (brk) return { label: brk.shortName, isBreak: true, inSemester: true, breakColor: brk.color }
      const wk = getAcademicWeek(probe)
      if (wk) return { label: `W${wk}`, isBreak: false, inSemester: true }
    }
  }

  // Edge case: probe is outside semester but the week straddles the boundary
  const crossTeach = dates.find(d => getAcademicWeek(d) !== null)
  if (crossTeach) return { label: `W${getAcademicWeek(crossTeach)}`, isBreak: false, inSemester: true }

  const crossBreak = dates.find(d => isInSemester(d) && getBreakForDate(d))
  if (crossBreak) {
    const b = getBreakForDate(crossBreak)
    return { label: b.shortName, isBreak: true, inSemester: true, breakColor: b.color }
  }

  return { label: null, isBreak: false, inSemester: false }
}
