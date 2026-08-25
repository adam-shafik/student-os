import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/googleAuthCode'   // must load first: claims Google's ?code= before Supabase's OAuth watcher strips it
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
