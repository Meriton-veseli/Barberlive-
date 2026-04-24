import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BookingPage from './pages/BookingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/:username" element={<BookingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App