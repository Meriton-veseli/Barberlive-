import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BookingPage from './pages/BookingPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/:username" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App