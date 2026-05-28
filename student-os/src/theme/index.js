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
    id: 'aurora',
    name: 'Aurora Gradient',
    description: 'Vibrant gradients, animated accents',
    preview: ['#64c8ff', '#9b7fff', '#4fffb0'],
  },
  {
    id: 'sakura',
    name: 'Sakura Glass',
    description: 'Elegant pink glassmorphism, deep plum luxury',
    preview: ['#f472b6', '#c084fc', '#130a18'],
  },
  {
    id: 'frost',
    name: 'Icy Frost',
    description: 'Frosted glass, crisp arctic blues',
    preview: ['#7dd3fc', '#a5b4fc', '#04101e'],
  },
  {
    id: 'forest',
    name: 'Forest Nature',
    description: 'Earthy greens, organic serif, calming study vibes',
    preview: ['#6aab6a', '#8cb88c', '#080e08'],
  },
  {
    id: 'terminal',
    name: 'Terminal Hacker',
    description: 'Monospace matrix green, scanlines, dev aesthetic',
    preview: ['#00cc00', '#00ff44', '#020402'],
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
