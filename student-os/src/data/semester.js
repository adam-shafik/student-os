// Semester configuration — update this when the user sets up their semester
// Designed to be dynamic: swap these values per-year or per-user once sign-up is added
const _start = new Date(2026, 1, 9)   // 9 Feb 2026
const _end   = new Date(2026, 4, 22)  // 22 May 2026 (inclusive)

export const semesterConfig = {
  start: _start,
  end:   _end,
  breaks: [
    {
      name:      'Easter Break',
      shortName: 'Easter',
      color:     '#fbbf24',
      start:     new Date(2026, 2, 30),  // 30 Mar 2026
      end:       new Date(2026, 3, 19),  // 19 Apr 2026 (lectures resume 20 Apr)
    },
  ],
  // One or two teaching blocks. Week numbers restart at 1 each semester.
  semesters: [
    { index: 1, start: _start, end: _end },
  ],
}
