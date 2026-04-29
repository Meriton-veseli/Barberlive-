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

// Parse appointment date+time into a real Date object for comparison
function parseAppointmentDate(day, time) {
  try {
    // day format: "Mon, Apr 29"  time format: "10:00 AM"
    const currentYear = new Date().getFullYear()
    return new Date(`${day.split(', ').slice(1).join(', ')} ${currentYear} ${time}`)
  } catch {
    return new Date(0)
  }
}

// Returns true if appointment time has already passed
function isPast(appointment) {
  const apptDate = parseAppointmentDate(appointment.day, appointment.time)
  return apptDate < new Date()
}

// Sort appointments by date+time ascending
function sortAppointments(list) {
  return [...list].sort((a, b) => {
    const da = parseAppointmentDate(a.day, a.time)
    const db_ = parseAppointmentDate(b.day, b.time)
    return da - db_
  })
}

function RescheduleModal({ appointment, onClose, onSave }) {
  const today = new Date()
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
  const days = week.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }))
  const dates = week.map(d => d.getDate().toString())
  const months = week.map(d => d.toLocaleDateString('en-US', { month: 'short' }))

  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!selectedSlot) return
    setSaving(true)
    const newDay = `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}`
    await updateDoc(doc(db, 'appointments', appointment.id), { day: newDay, time: selectedSlot })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-lg">Reschedule</p>
            <p className="text-violet-200 text-xs mt-0.5">{appointment.clientName} · {appointment.service}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white font-black transition-all">✕</button>
        </div>
        <div className="p-6">
          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-3">Pick a new day</p>
          <div className="grid grid-cols-7 gap-1.5 mb-6">
            {days.map((day, i) => (
              <button key={day} onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                className={`flex flex-col items-center py-2.5 rounded-xl text-xs transition-all ${selectedDay === i ? 'bg-gradient-to-b from-violet-600 to-purple-700 text-white shadow-md shadow-violet-200' : 'bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}>
                <span className="font-bold">{day}</span>
                <span className="font-black mt-0.5">{dates[i]}</span>
                <span style={{ fontSize: '9px' }} className="opacity-70">{months[i]}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-3">Pick a new time</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {ALL_SLOTS.map((slot) => (
              <button key={slot} onClick={() => setSelectedSlot(slot)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${selectedSlot === slot ? 'bg-gradient-to-b from-violet-600 to-purple-700 text-white shadow-md shadow-violet-200' : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-600'}`}>
                {slot}
              </button>
            ))}
          </div>
          {selectedSlot && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mb-4">
              <p className="text-xs text-violet-600 font-bold">New time: {days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]} at {selectedSlot}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm transition-all">Cancel</button>
            <button onClick={handleSave} disabled={!selectedSlot || saving}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all">
              {saving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</span> : 'Confirm reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ barber, db, auth, setBarber }) {
  const [form, setForm] = useState({ displayName: barber?.displayName || '', bio: barber?.bio || '', location: barber?.location || '', phone: barber?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const user = auth.currentUser
    await updateDoc(doc(db, 'barbers', user.uid), form)
    setBarber(prev => ({ ...prev, ...form }))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <p className="text-base font-black text-gray-900 mb-1">Your profile</p>
      <p className="text-xs text-gray-400 mb-8">This info shows on your public booking page.</p>
      <div className="flex items-center gap-5 mb-8 pb-8 border-b border-gray-100">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-lg shadow-violet-200">
          {barber?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-black text-gray-900">@{barber?.username}</p>
          <p className="text-xs text-gray-400 mt-1">Profile photo coming soon</p>
        </div>
      </div>
      <div className="space-y-5">
        {[
          { label: 'Display name', key: 'displayName', placeholder: 'e.g. John the Barber', type: 'text' },
          { label: 'Location', key: 'location', placeholder: 'e.g. Brooklyn, NY', type: 'text' },
          { label: 'Phone number', key: 'phone', placeholder: 'e.g. +1 234 567 8900', type: 'tel' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key}>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{label}</label>
            <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white transition-all" />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Bio</label>
          <textarea placeholder="Tell clients a bit about yourself..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3}
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white transition-all resize-none" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="mt-6 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white text-sm font-bold px-8 py-3 rounded-2xl transition-all hover:shadow-lg hover:shadow-violet-200">
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save profile'}
      </button>
    </div>
  )
}

function AvailabilityTab({ barber, db, auth }) {
  const [availability, setAvailability] = useState(barber?.availability || DEFAULT_AVAILABILITY)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  function update(day, field, value) {
    setAvailability(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    const user = auth.currentUser
    await updateDoc(doc(db, 'barbers', user.uid), { availability })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <p className="text-base font-black text-gray-900 mb-1">Weekly availability</p>
      <p className="text-xs text-gray-400 mb-8">Set the hours clients can book you each day.</p>
      <div className="space-y-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${availability[day]?.enabled ? 'bg-violet-50 border border-violet-100' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="w-28 flex items-center gap-3">
              <div onClick={() => update(day, 'enabled', !availability[day]?.enabled)}
                className={`w-10 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${availability[day]?.enabled ? 'bg-violet-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${availability[day]?.enabled ? 'left-5' : 'left-1'}`} />
              </div>
              <span className={`text-sm font-bold ${availability[day]?.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{day.slice(0, 3)}</span>
            </div>
            {availability[day]?.enabled ? (
              <div className="flex items-center gap-2">
                <select value={availability[day]?.start} onChange={e => update(day, 'start', e.target.value)}
                  className="text-sm bg-white border-2 border-violet-100 rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-violet-400">
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
                <span className="text-gray-400 text-xs font-bold">→</span>
                <select value={availability[day]?.end} onChange={e => update(day, 'end', e.target.value)}
                  className="text-sm bg-white border-2 border-violet-100 rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-violet-400">
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ) : <span className="text-xs text-gray-400 font-medium">Day off</span>}
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="mt-6 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white text-sm font-bold px-8 py-3 rounded-2xl transition-all hover:shadow-lg hover:shadow-violet-200">
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save availability'}
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
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function startEdit(i) { setEditingIndex(i); setEditForm({ ...services[i] }) }
  function cancelEdit() { setEditingIndex(null) }

  async function saveEdit() {
    const updated = services.map((s, i) => i === editingIndex ? editForm : s)
    setServices(updated); setEditingIndex(null)
    await saveServices(updated)
  }

  async function deleteService(i) {
    if (!window.confirm('Delete this service?')) return
    const updated = services.filter((_, idx) => idx !== i)
    setServices(updated); await saveServices(updated)
  }

  async function addService() {
    if (!newService.name || !newService.price) return
    const updated = [...services, newService]
    setServices(updated)
    setNewService({ name: '', duration: '30 min', price: '' })
    setAdding(false); await saveServices(updated)
  }

  const inputCls = "bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white transition-all"

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <p className="text-base font-black text-gray-900">Services</p>
        <p className="text-xs text-gray-400 mt-1">Manage what clients can book</p>
      </div>
      {services.map((s, i) => (
        <div key={i} className={`px-6 py-4 ${i !== services.length - 1 ? 'border-b border-gray-50' : ''}`}>
          {editingIndex === i ? (
            <div className="flex items-center gap-3 flex-wrap">
              <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Service name" className={`flex-1 min-w-32 ${inputCls}`} />
              <input type="text" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} placeholder="Duration" className={`w-24 ${inputCls}`} />
              <input type="text" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" className={`w-20 ${inputCls}`} />
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl font-bold">{saving ? '...' : 'Save'}</button>
                <button onClick={cancelEdit} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-lg flex-shrink-0">✂️</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-violet-600">${s.price}</span>
                <button onClick={() => startEdit(i)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-bold transition-all">Edit</button>
                <button onClick={() => deleteService(i)} className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl font-bold transition-all">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="px-6 py-5 bg-gray-50">
        {adding ? (
          <div className="flex items-center gap-3 flex-wrap">
            <input type="text" value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })} placeholder="Service name" className={`flex-1 min-w-32 ${inputCls}`} />
            <input type="text" value={newService.duration} onChange={e => setNewService({ ...newService, duration: e.target.value })} placeholder="Duration" className={`w-24 ${inputCls}`} />
            <input type="text" value={newService.price} onChange={e => setNewService({ ...newService, price: e.target.value })} placeholder="Price" className={`w-20 ${inputCls}`} />
            <div className="flex gap-2">
              <button onClick={addService} disabled={!newService.name || !newService.price} className="text-xs bg-violet-600 hover:bg-violet-700 disabled:bg-violet-200 text-white px-4 py-2 rounded-xl font-bold">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs bg-white hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold border border-gray-200">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-sm text-violet-600 font-black hover:text-violet-700 flex items-center gap-2">
            <span className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center text-base leading-none">+</span>
            Add service
          </button>
        )}
      </div>
      {saved && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-100">
          <p className="text-xs text-green-600 font-bold">✓ Services saved successfully!</p>
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
  const [rescheduling, setRescheduling] = useState(null)

  useEffect(() => {
    const user = auth.currentUser
    if (!user) { navigate('/login'); return }
    async function fetchBarber() {
      const snap = await getDoc(doc(db, 'barbers', user.uid))
      if (snap.exists()) setBarber(snap.data())
      setLoading(false)
    }
    fetchBarber()
  }, [navigate])

  useEffect(() => {
    if (!barber) return
    const q = query(collection(db, 'appointments'), where('username', '==', barber.username))
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [barber])

  async function handleLogout() { await signOut(auth); navigate('/') }

  function copyLink() {
    navigator.clipboard.writeText(`barbr.app/${barber.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return
    await deleteDoc(doc(db, 'appointments', id))
  }

  // Split and sort appointments
  const sorted = sortAppointments(appointments)
  const upcomingList = sorted.filter(a => !isPast(a))
  const completedList = sorted.filter(a => isPast(a)).reverse() // most recent completed first

  const revenue = completedList.reduce((sum, a) => sum + parseFloat(a.price || 0), 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const AppointmentRow = ({ a, i, total, isCompleted }) => (
    <div
      className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${i !== total - 1 ? 'border-b border-gray-50' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${isCompleted ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
          {a.clientName?.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className={`text-sm font-bold ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{a.clientName}</p>
          <p className="text-xs text-gray-400">{a.service}</p>
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <p className={`text-sm font-bold ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>{a.time}</p>
        <p className="text-xs text-gray-400">{a.day}</p>
      </div>
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-600">
            ✓ done
          </span>
        ) : (
          <>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-violet-100 text-violet-700">upcoming</span>
            <button onClick={() => setRescheduling(a)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-500 font-bold px-3 py-1.5 rounded-full transition-all">Reschedule</button>
            <button onClick={() => handleCancel(a.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-bold px-3 py-1.5 rounded-full transition-all">Cancel</button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {rescheduling && (
        <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)} onSave={() => setRescheduling(null)} />
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="text-2xl font-black tracking-tight text-gray-900">barb<span className="text-violet-600">r</span></div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
              {barber?.username?.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-gray-700">@{barber?.username}</span>
          </div>
          <button onClick={handleLogout} className="text-sm border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-2xl text-gray-500 font-semibold transition-all">Log out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-1">{greeting}, @{barber?.username} 👋</h1>
          <p className="text-gray-400 text-sm">Here's what's happening with your bookings today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total bookings', value: appointments.length, icon: '📅', gradient: 'from-violet-500 to-purple-600' },
            { label: 'Upcoming', value: upcomingList.length, icon: '⏰', gradient: 'from-blue-500 to-indigo-600' },
            { label: 'Est. revenue', value: `$${revenue}`, icon: '💰', gradient: 'from-emerald-500 to-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-xl shadow-md flex-shrink-0`}>{stat.icon}</div>
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 mb-6 flex items-center justify-between gap-4 shadow-lg shadow-violet-200">
          <div>
            <p className="text-xs text-violet-200 font-bold uppercase tracking-wider mb-1">Your booking link</p>
            <p className="text-white font-black text-lg">barbr.app/{barber?.username}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={copyLink} className="text-sm bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2.5 rounded-2xl transition-all backdrop-blur-sm">{copied ? '✓ Copied!' : 'Copy link'}</button>
            <button onClick={() => navigate(`/${barber?.username}`)} className="text-sm bg-white text-violet-700 hover:bg-violet-50 font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm">Preview</button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white border border-gray-100 shadow-sm p-1.5 rounded-2xl w-fit">
          {['appointments', 'services', 'availability', 'profile'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${tab === t ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-md' : 'text-gray-400 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'appointments' && (
          <div className="space-y-4">

            {/* Upcoming */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <p className="text-base font-black text-gray-900">Upcoming</p>
                  <p className="text-xs text-gray-400 mt-1">{upcomingList.length} appointment{upcomingList.length !== 1 ? 's' : ''} scheduled</p>
                </div>
                <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full">{upcomingList.length}</span>
              </div>
              {upcomingList.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-sm font-bold text-gray-400">No upcoming appointments</p>
                  <p className="text-xs text-gray-300 mt-1">Share your booking link to get started!</p>
                </div>
              ) : (
                upcomingList.map((a, i) => (
                  <AppointmentRow key={a.id} a={a} i={i} total={upcomingList.length} isCompleted={false} />
                ))
              )}
            </div>

            {/* Completed */}
            {completedList.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-base font-black text-gray-900">Completed</p>
                    <p className="text-xs text-gray-400 mt-1">{completedList.length} appointment{completedList.length !== 1 ? 's' : ''} done</p>
                  </div>
                  <span className="text-xs font-bold bg-green-100 text-green-600 px-3 py-1.5 rounded-full">{completedList.length}</span>
                </div>
                {completedList.map((a, i) => (
                  <AppointmentRow key={a.id} a={a} i={i} total={completedList.length} isCompleted={true} />
                ))}
              </div>
            )}

          </div>
        )}

        {tab === 'services' && <ServicesTab barber={barber} db={db} auth={auth} setBarber={setBarber} />}
        {tab === 'availability' && <AvailabilityTab barber={barber} db={db} auth={auth} />}
        {tab === 'profile' && <ProfileTab barber={barber} db={db} auth={auth} setBarber={setBarber} />}

      </div>
    </div>
  )
}

export default Dashboard