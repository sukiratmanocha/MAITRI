import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import { AuthProvider } from './context/AuthContext'
import { LiveFeedProvider } from './context/LiveFeedContext'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Imports from './pages/Imports'
import Exports from './pages/Exports'
import Vessels from './pages/Vessels'
import Messages from './pages/Messages'
import Login from './pages/Login'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <LiveFeedProvider>
              <DashboardLayout />
            </LiveFeedProvider>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/imports" element={<Imports />} />
            <Route path="/exports" element={<Exports />} />
            <Route path="/vessels" element={<Vessels />} />
            <Route path="/messages" element={<Messages />} />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

