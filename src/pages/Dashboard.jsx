import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

const ALL_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM',
]

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_AVAILABILITY = {
  Monday:    { enabled: true,  start: '9:00 AM', end: '5:00 PM' },
  Tuesday:   { enabled: true,  start: '9:00 AM', end: '5:00 PM' },
  Wednesday: { enabled: true,  start: '9:00 AM', end: '5:00 PM' },
  Thursday:  { enabled: true,  start: '9:00 AM', end: '5:00 PM' },
  Friday:    { enabled: true,  start: '9:00 AM', end: '5:00 PM' },
  Saturday:  { enabled: true,  start: '9:00 AM', end: '2:00 PM' },
  Sunday:    { enabled: false, start: '9:00 AM', end: '5:00 PM' },
}

function AvailabilityTab({ barber, db, auth }) {
  const [availability, setAvailability] = useState(barber?.availability || DEFAULT_AVAILABILITY)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  function update(day, field, value) {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  async function handleSave() {
    setSaving(true)
    const user = auth.currentUser
    await updateDoc(doc(db, 'barbers', user.uid), { availability })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6">
      <p className="text-sm font-medium text-gray-900 mb-1">Weekly availability</p>
      <p className="text-xs text-gray-400 mb-6">Set the hours clients can book you each day.</p>
      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="flex items-center gap-4 py-3 border-b border-gray-50">
            <div className="w-24 flex items-center gap-2">
              <input
                type="checkbox"
                checked={availability[day]?.enabled}
                onChange={e => update(day, 'enabled', e.target.checked)}
                className="accent-purple-600"
              />
              <span className={`text-sm ${availability[day]?.enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                {day.slice(0, 3)}
              </span>
            </div>
            {availability[day]?.enabled ? (
              <div className="flex items-center gap-2">
                <select
                  value={availability[day]?.start}
                  onChange={e => update(day, 'start', e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none"
                >
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
                <span className="text-gray-300 text-xs">to</span>
                <select
                  value={availability[day]?.end}
                  onChange={e => update(day, 'end', e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none"
                >
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <span className="text-xs text-gray-300">Day off</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 text-white text-sm font-medium px-6 py-2.5 rounded-lg"
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save availability'}
      </button>
    </div>
  )
}

function ServicesTab({ barber, db, auth, setBarber }) {
  const [services, setServices] = useState(barber?.services || [])
  const [editingIndex, setEditingIndex] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', duration: '', price: '' })
  const [adding, setAdding] = useState(false)
  const [newService, setNewService] = useState({ name: '', duration: '30 min', price: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveServices(updated) {
    setSaving(true)
    const user = auth.currentUser
    await updateDoc(doc(db, 'barbers', user.uid), { services: updated })
    setBarber(prev => ({ ...prev, services: updated }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function startEdit(i) {
    setEditingIndex(i)
    setEditForm({ ...services[i] })
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditForm({ name: '', duration: '', price: '' })
  }

  async function saveEdit() {
    const updated = services.map((s, i) => i === editingIndex ? editForm : s)
    setServices(updated)
    setEditingIndex(null)
    await saveServices(updated)
  }

  async function deleteService(i) {
    if (!window.confirm('Delete this service?')) return
    const updated = services.filter((_, idx) => idx !== i)
    setServices(updated)
    await saveServices(updated)
  }

  async function addService() {
    if (!newService.name || !newService.price) return
    const updated = [...services, newService]
    setServices(updated)
    setNewService({ name: '', duration: '30 min', price: '' })
    setAdding(false)
    await saveServices(updated)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      {services.map((s, i) => (
        <div key={i} className={`px-6 py-4 ${i !== services.length - 1 ? 'border-b border-gray-50' : ''}`}>
          {editingIndex === i ? (
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Service name"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 min-w-32"
              />
              <input
                type="text"
                value={editForm.duration}
                onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                placeholder="Duration"
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
              <input
                type="text"
                value={editForm.price}
                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                placeholder="Price"
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs border border-gray-200 hover:bg-gray-50 text-gray-500 px-3 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">{s.duration}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">${s.price}</span>
                <button
                  onClick={() => startEdit(i)}
                  className="text-xs border border-gray-200 hover:bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteService(i)}
                  className="text-xs border border-red-100 hover:border-red-200 text-red-400 hover:text-red-500 px-3 py-1.5 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="px-6 py-4 border-t border-gray-50">
        {adding ? (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
              placeholder="Service name"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 min-w-32"
            />
            <input
              type="text"
              value={newService.duration}
              onChange={e => setNewService({ ...newService, duration: e.target.value })}
              placeholder="Duration"
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
            <input
              type="text"
              value={newService.price}
              onChange={e => setNewService({ ...newService, price: e.target.value })}
              placeholder="Price"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
            <div className="flex gap-2">
              <button
                onClick={addService}
                disabled={!newService.name || !newService.price}
                className="text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 text-white px-3 py-2 rounded-lg"
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-xs border border-gray-200 hover:bg-gray-50 text-gray-500 px-3 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-purple-600 font-medium hover:underline"
          >
            + Add service
          </button>
        )}
      </div>
      {saved && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-100">
          <p className="text-xs text-green-600">Services saved successfully!</p>
        </div>
      )}
    </div>
  )
}

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
          {['appointments', 'services', 'availability'].map((t) => (
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
          <ServicesTab barber={barber} db={db} auth={auth} setBarber={setBarber} />
        )}

        {tab === 'availability' && (
          <AvailabilityTab barber={barber} db={db} auth={auth} />
        )}

      </div>
    </div>
  )
}

export default Dashboard