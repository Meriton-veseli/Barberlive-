import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setChecking(false)
    })
    return () => unsub()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
