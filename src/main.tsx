import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import RandomImagePage from './components/RandomImagePage.tsx'

const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'
const isRandomImageRoute = normalizedPath === '/random-image'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isRandomImageRoute ? <RandomImagePage /> : <App />}
  </StrictMode>,
)
