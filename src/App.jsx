import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const Landing = lazy(() => import('./pages/Landing'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-violet-50" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/:username" element={<BookingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
