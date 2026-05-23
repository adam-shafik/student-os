export const THEMES = [
  {
    id: 'default',
    name: 'Midnight Dark',
    description: 'Classic dark theme',
    preview: ['#5b8cff', '#a78bfa', '#14151e'],
  },
  {
    id: 'neon',
    name: 'Midnight Neon',
    description: 'OLED black with glowing neon accents',
    preview: ['#5b8cff', '#bf7fff', '#00d4ff'],
  },
  {
    id: 'minimal',
    name: 'Academic Minimal',
    description: 'Clean light mode, distraction-free',
    preview: ['#4472f5', '#7c55d4', '#ffffff'],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High-tech hacker aesthetic, electric neon',
    preview: ['#00e5ff', '#ff00aa', '#00ff88'],
  },
  {
    id: 'latenight',
    name: 'Late Night Study',
    description: 'Warm amber tones, easy on the eyes',
    preview: ['#f59e0b', '#e07b39', '#1c1810'],
  },
  {
    id: 'aurora',
    name: 'Aurora Gradient',
    description: 'Vibrant gradients, animated accents',
    preview: ['#64c8ff', '#9b7fff', '#4fffb0'],
  },
]

export function getStoredTheme() {
  try { return localStorage.getItem('sos-theme') || 'default' } catch { return 'default' }
}

export function applyTheme(id) {
  const html = document.documentElement
  THEMES.forEach(t => html.classList.remove(`theme-${t.id}`))
  if (id !== 'default') html.classList.add(`theme-${id}`)
  try { localStorage.setItem('sos-theme', id) } catch {}
}
