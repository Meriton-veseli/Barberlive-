import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('appointments')
  const [barber, setBarber] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = auth.currentUser
    if (!user) { navigate('/login'); return }

    async function fetchBarber() {
      const snap = await getDoc(doc(db, 'barbers', user.uid))
      if (snap.exists()) {
        setBarber(snap.data())
      }
      setLoading(false)
    }
    fetchBarber()
  }, [navigate])

  useEffect(() => {
    if (!barber) return
    const q = query(
      collection(db, 'appointments'),
      where('username', '==', barber.username)
    )
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [barber])

  async function handleLogout() {
    await signOut(auth)
    navigate('/')
  }

  function copyLink() {
    navigator.clipboard.writeText(`barbr.app/${barber.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return
    await deleteDoc(doc(db, 'appointments', id))
  }

  const upcoming = appointments.filter(a => a.status === 'upcoming')
  const revenue = appointments.reduce((sum, a) => {
    const price = parseFloat(a.price?.replace('$', '') || 0)
    return sum + price
  }, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="text-xl font-medium tracking-tight">
          barb<span className="text-purple-600">r</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">@{barber?.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-gray-600"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Total bookings</p>
            <p className="text-3xl font-medium text-gray-900">{appointments.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Upcoming</p>
            <p className="text-3xl font-medium text-gray-900">{upcoming.length}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Est. revenue</p>
            <p className="text-3xl font-medium text-gray-900">${revenue}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Your booking link</p>
            <p className="text-sm text-purple-600 font-medium">barbr.app/{barber?.username}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-600 font-medium px-4 py-2 rounded-lg"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={() => navigate(`/${barber?.username}`)}
              className="text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg"
            >
              Preview
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['appointments', 'services'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'appointments' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {appointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-gray-400">No appointments yet. Share your booking link to get started!</p>
              </div>
            ) : (
              appointments.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i !== appointments.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600 flex-shrink-0">
                      {a.clientName?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.clientName}</p>
                      <p className="text-xs text-gray-400">{a.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{a.time}</p>
                    <p className="text-xs text-gray-400">{a.day}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-600">
                      upcoming
                    </span>
                    <button
                      onClick={() => handleCancel(a.id)}
                      className="text-xs text-red-400 hover:text-red-500 border border-red-100 hover:border-red-200 px-3 py-1 rounded-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'services' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {barber?.services?.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-6 py-4 ${
                  i !== barber.services.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.duration}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">${s.price}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default Dashboard