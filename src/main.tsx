import '@fontsource-variable/google-sans-flex/rond.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/build.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { HomePage } from './features/home/HomePage'
import { DailyPage } from './features/planner/DailyPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          {/* An address names a view and nothing else; anything typed after it is dropped. */}
          <Route path="daily" element={<DailyPage />} />
          <Route path="daily/*" element={<Navigate to="/daily" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
