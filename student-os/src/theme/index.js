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
    wallpaper: 'aurora.jpg',
    wallpaperOverlay: 'rgba(6,4,18,0.74)',
  },
  {
    id: 'sakura',
    name: 'Sakura Glass',
    description: 'Elegant pink glassmorphism, deep plum luxury',
    preview: ['#f472b6', '#c084fc', '#130a18'],
    wallpaper: 'sakura.jpg',
    wallpaperOverlay: 'rgba(19,10,24,0.76)',
  },
  {
    id: 'frost',
    name: 'Icy Frost',
    description: 'Frosted glass, crisp arctic blues',
    preview: ['#7dd3fc', '#a5b4fc', '#04101e'],
    wallpaper: 'frost.jpg',
    wallpaperOverlay: 'rgba(4,16,30,0.76)',
  },
  {
    id: 'forest',
    name: 'Forest Nature',
    description: 'Earthy greens, organic serif, calming study vibes',
    preview: ['#6aab6a', '#8cb88c', '#080e08'],
    wallpaper: 'forest.jpg',
    wallpaperOverlay: 'rgba(8,14,8,0.76)',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    description: 'Bioluminescent teal, underwater research station vibes',
    preview: ['#00C4D4', '#20E8B0', '#0D2035'],
    wallpaper: 'ocean.jpg',
    wallpaperOverlay: 'rgba(7,20,34,0.76)',
  },
  {
    id: 'akatsuki',
    name: 'Rainy Akatsuki',
    description: 'Dark slate, crimson accents, rain village atmosphere',
    preview: ['#DC2626', '#EF4444', '#262B34'],
    wallpaper: 'akatsuki.jpg',
    wallpaperOverlay: 'rgba(14,16,22,0.80)',
  },
]

export function getStoredTheme() {
  try { return localStorage.getItem('sos-theme') || 'default' } catch { return 'default' }
}

export function applyTheme(id) {
  const html = document.documentElement
  THEMES.forEach(t => html.classList.remove(`theme-${t.id}`))
  // clear any wallpaper set by a previous theme
  html.style.removeProperty('--bg-body-image')

  if (id !== 'default') html.classList.add(`theme-${id}`)

  const themeData = THEMES.find(t => t.id === id)
  if (themeData?.wallpaper) {
    const overlay = themeData.wallpaperOverlay || 'rgba(0,0,0,0.76)'
    html.style.setProperty(
      '--bg-body-image',
      `linear-gradient(${overlay}, ${overlay}), url('/wallpapers/${themeData.wallpaper}')`
    )
  }

  try { localStorage.setItem('sos-theme', id) } catch {}
}
