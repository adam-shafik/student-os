import { semesterConfig as _defaultConfig } from '../data/semester'

const MS = 86400000
const d0 = date => { const n = new Date(date); n.setHours(0, 0, 0, 0); return n }

// Module-level config — updated by App.jsx once user profile is loaded from DB
let _config = _defaultConfig
export function setSemesterConfig(config) { _config = config }
export function getSemesterConfig() { return _config }

// Normalised list of semesters — always at least one entry
function semesters() {
  if (_config.semesters && _config.semesters.length) return _config.semesters
  return [{ index: 1, start: _config.start, end: _config.end }]
}

export function getSemesterCount() { return semesters().length }

// The semester object whose date range contains `date`, or null (incl. the gap between semesters)
export function getSemesterForDate(date) {
  const d = d0(date)
  return semesters().find(s => d >= d0(s.start) && d <= d0(s.end)) || null
}

export function getSemesterIndexForDate(date) {
  return getSemesterForDate(date)?.index ?? null
}

export function isInSemester(date) {
  return getSemesterForDate(date) != null
}

export function getBreakForDate(date) {
  const d = d0(date)
  return _config.breaks.find(b => d >= d0(b.start) && d <= d0(b.end)) || null
}

// Returns teaching week number (1-based, restarts each semester) or null if outside a
// semester / in a break.
export function getAcademicWeek(date) {
  const d   = d0(date)
  const sem = getSemesterForDate(d)
  if (!sem || getBreakForDate(d)) return null

  const semStart = d0(sem.start)
  const semEnd   = d0(sem.end)

  // Count break days within THIS semester that fall strictly before d
  let breakDays = 0
  for (const brk of _config.breaks) {
    const bStart = d0(brk.start)
    const bEnd   = d0(brk.end)
    if (bEnd < semStart || bStart > semEnd) continue
    if (bStart < d) {
      const effectiveEnd = bEnd < d ? bEnd : new Date(d - MS)
      if (effectiveEnd >= bStart)
        breakDays += Math.round((effectiveEnd - bStart) / MS) + 1
    }
  }

  const daysSinceStart = Math.round((d - semStart) / MS)
  return Math.floor((daysSinceStart - breakDays) / 7) + 1
}

function weeksInSemester(sem) {
  const start = d0(sem.start)
  const end   = d0(sem.end)
  const totalDays = Math.round((end - start) / MS) + 1
  const breakDays = (_config.breaks || []).reduce((sum, b) => {
    const bs = d0(b.start)
    const be = d0(b.end)
    if (be < start || bs > end) return sum
    const s = bs < start ? start : bs
    const e = be > end   ? end   : be
    return sum + Math.round((e - s) / MS) + 1
  }, 0)
  return Math.ceil((totalDays - breakDays) / 7)
}

// Teaching weeks in a given semester (by index), or the longest semester when no index
// is passed (used to size week-number pickers).
export function totalTeachingWeeks(semIndex) {
  const sems = semesters()
  if (semIndex != null) {
    const s = sems.find(x => x.index === semIndex)
    return s ? weeksInSemester(s) : 0
  }
  return Math.max(...sems.map(weeksInSemester))
}

// Given a calendar week row (array of day objects with .date), return display info
export function getWeekRowInfo(weekDays, weekStartSunday = false) {
  const dates = weekDays.map(wd => wd.date)
  const multi = semesters().length > 1
  // Wednesday: Mon-first row = index 2, Sun-first row = index 3
  const probe = dates[weekStartSunday ? 3 : 2] || dates[0]

  const make = (probeDate) => {
    const brk = getBreakForDate(probeDate)
    if (brk) return { label: brk.shortName, isBreak: true, inSemester: true, breakColor: brk.color }
    const wk = getAcademicWeek(probeDate)
    if (wk) {
      const si = getSemesterIndexForDate(probeDate)
      return { label: multi ? `S${si}·W${wk}` : `W${wk}`, isBreak: false, inSemester: true, semesterIndex: si }
    }
    return null
  }

  if (probe && isInSemester(probe)) {
    const r = make(probe)
    if (r) return r
  }

  // Edge case: probe is outside semester but the week straddles a boundary
  const crossTeach = dates.find(d => getAcademicWeek(d) !== null)
  if (crossTeach) { const r = make(crossTeach); if (r) return r }

  const crossBreak = dates.find(d => isInSemester(d) && getBreakForDate(d))
  if (crossBreak) {
    const b = getBreakForDate(crossBreak)
    return { label: b.shortName, isBreak: true, inSemester: true, breakColor: b.color }
  }

  return { label: null, isBreak: false, inSemester: false }
}
