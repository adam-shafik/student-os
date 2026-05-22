// Semester configuration — update this when the user sets up their semester
// Designed to be dynamic: swap these values per-year or per-user once sign-up is added
export const semesterConfig = {
  start: new Date(2026, 1, 9),   // 9 Feb 2026
  end:   new Date(2026, 4, 22),  // 22 May 2026 (inclusive)
  breaks: [
    {
      name:      'Easter Break',
      shortName: 'Easter',
      color:     '#fbbf24',
      start:     new Date(2026, 2, 30),  // 30 Mar 2026
      end:       new Date(2026, 3, 19),  // 19 Apr 2026 (lectures resume 20 Apr)
    },
  ],
}
