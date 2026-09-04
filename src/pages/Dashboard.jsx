import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore'
import { signOut } from 'firebase/auth'

const ALL_SLOTS = [
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM',
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

function slotToMinutes(slot) {
  const [time, modifier] = slot.split(' ')
  let [hours, minutes] = time.split(':').map(Number)
  if (modifier === 'PM' && hours !== 12) hours += 12
  if (modifier === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

function occupiedSlotMinutes(slot, duration) {
  const start = slotToMinutes(slot)
  const end = start + Number.parseInt(duration, 10)
  const slots = []
  for (let minute = start; minute < end; minute += 30) slots.push(minute)
  return slots
}

function formatDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseAppointmentDate(day, time) {
  try {
    const parts = day.split(', ')
    const monthDay = parts.slice(1).join(' ')
    const currentYear = new Date().getFullYear()
    return new Date(`${monthDay} ${currentYear} ${time}`)
  } catch {
    return new Date(0)
  }
}

function isPast(appointment) {
  const apptDate = parseAppointmentDate(appointment.day, appointment.time)
  return apptDate < new Date()
}

function sortAppointments(list) {
  return [...list].sort((a, b) => {
    const da = parseAppointmentDate(a.day, a.time)
    const db_ = parseAppointmentDate(b.day, b.time)
    return da - db_
  })
}

function getAppointmentDate(a) {
  if (a.dateKey) {
    const [y, m, d] = a.dateKey.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return parseAppointmentDate(a.day, a.time)
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getPeriodBounds(range, offset) {
  const now = new Date()
  if (range === 'week') {
    const start = startOfWeek(now)
    start.setDate(start.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
    return { start, end }
  }
  const start = new Date(now.getFullYear() + offset, 0, 1)
  const end = new Date(now.getFullYear() + offset + 1, 0, 1)
  return { start, end }
}

function inRange(date, start, end) {
  return date >= start && date < end
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function RescheduleModal({ appointment, barber, onClose, onSave }) {
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
    const dateKey = formatDateKey(week[selectedDay])
    const newMinutes = occupiedSlotMinutes(selectedSlot, appointment.duration || 30)
    const newReservationRefs = newMinutes.map(minute => doc(db, 'bookingSlots', `${barber.uid}_${dateKey}_${minute}`))
    const oldReservationRefs = (appointment.occupiedSlotMinutes || []).map(minute =>
      doc(db, 'bookingSlots', `${barber.uid}_${appointment.dateKey}_${minute}`)
    )

    try {
      await runTransaction(db, async (transaction) => {
        const reservations = await Promise.all(newReservationRefs.map(ref => transaction.get(ref)))
        if (reservations.some(reservation => reservation.exists() && reservation.data().appointmentId !== appointment.id)) {
          throw new Error('That time was just booked. Please choose another slot.')
        }
        oldReservationRefs.forEach(ref => transaction.delete(ref))
        newReservationRefs.forEach((ref, index) => transaction.set(ref, {
          barberId: barber.uid,
          dateKey,
          minute: newMinutes[index],
          appointmentId: appointment.id,
        }))
        transaction.update(doc(db, 'appointments', appointment.id), {
          day: newDay,
          time: selectedSlot,
          dateKey,
          occupiedSlotMinutes: newMinutes,
        })
      })
      onSave()
    } catch (err) {
      window.alert(err.message === 'That time was just booked. Please choose another slot.' ? err.message : 'Could not reschedule the appointment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0F3D40] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-lg">Reschedule</p>
            <p className="text-[#9DC7C8] text-xs mt-0.5">{appointment.clientName} · {appointment.service}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center text-white font-black transition-all">✕</button>
        </div>
        <div className="p-6">
          <p className="text-xs text-[#0F3D40] font-black uppercase tracking-widest mb-3">Pick a new day</p>
          <div className="grid grid-cols-7 gap-1.5 mb-6">
            {days.map((day, i) => (
              <button key={day} onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                className={`flex flex-col items-center py-2.5 rounded-xl text-xs transition-all ${selectedDay === i ? 'bg-[#0F3D40] text-white' : 'bg-gray-50 text-gray-500 hover:bg-[#F3F7F6] hover:text-[#0F3D40]'}`}>
                <span className="font-bold">{day}</span>
                <span className="font-black mt-0.5">{dates[i]}</span>
                <span style={{ fontSize: '9px' }} className="opacity-70">{months[i]}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[#0F3D40] font-black uppercase tracking-widest mb-3">Pick a new time</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {ALL_SLOTS.map((slot) => (
              <button key={slot} onClick={() => setSelectedSlot(slot)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${selectedSlot === slot ? 'bg-[#0F3D40] text-white' : 'bg-gray-50 text-gray-600 hover:bg-[#F3F7F6] hover:text-[#0F3D40]'}`}>
                {slot}
              </button>
            ))}
          </div>
          {selectedSlot && (
            <div className="bg-[#EAF3F2] border border-[#D3E5E4] rounded-2xl px-4 py-3 mb-4">
              <p className="text-xs text-[#0F3D40] font-bold">New time: {days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]} at {selectedSlot}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm transition-all">Cancel</button>
            <button onClick={handleSave} disabled={!selectedSlot || saving}
              className="flex-1 bg-[#0F3D40] hover:bg-[#0C3134] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all">
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
        <div className="w-20 h-20 rounded-3xl bg-[#0F3D40] flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
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
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#0F3D40] focus:bg-white transition-all" />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Bio</label>
          <textarea placeholder="Tell clients a bit about yourself..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3}
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#0F3D40] focus:bg-white transition-all resize-none" />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="mt-6 bg-[#0F3D40] hover:bg-[#0C3134] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold px-8 py-3 rounded-2xl transition-all">
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
          <div key={day} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${availability[day]?.enabled ? 'bg-[#F3F7F6] border border-[#D3E5E4]' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="w-28 flex items-center gap-3">
              <div onClick={() => update(day, 'enabled', !availability[day]?.enabled)}
                className={`w-10 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${availability[day]?.enabled ? 'bg-[#0F3D40]' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${availability[day]?.enabled ? 'left-5' : 'left-1'}`} />
              </div>
              <span className={`text-sm font-bold ${availability[day]?.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{day.slice(0, 3)}</span>
            </div>
            {availability[day]?.enabled ? (
              <div className="flex items-center gap-2">
                <select value={availability[day]?.start} onChange={e => update(day, 'start', e.target.value)}
                  className="text-sm bg-white border-2 border-[#D3E5E4] rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-[#0F3D40]">
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
                <span className="text-gray-400 text-xs font-bold">→</span>
                <select value={availability[day]?.end} onChange={e => update(day, 'end', e.target.value)}
                  className="text-sm bg-white border-2 border-[#D3E5E4] rounded-xl px-3 py-1.5 text-gray-700 outline-none focus:border-[#0F3D40]">
                  {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ) : <span className="text-xs text-gray-400 font-medium">Day off</span>}
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="mt-6 bg-[#0F3D40] hover:bg-[#0C3134] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold px-8 py-3 rounded-2xl transition-all">
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

  const inputCls = "bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F3D40] focus:bg-white transition-all"

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
                <button onClick={saveEdit} disabled={saving} className="text-xs bg-[#0F3D40] hover:bg-[#0C3134] text-white px-4 py-2 rounded-xl font-bold">{saving ? '...' : 'Save'}</button>
                <button onClick={cancelEdit} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF3F2] flex items-center justify-center text-lg flex-shrink-0">✂️</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-[#0F3D40]">${s.price}</span>
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
              <button onClick={addService} disabled={!newService.name || !newService.price} className="text-xs bg-[#0F3D40] hover:bg-[#0C3134] disabled:bg-gray-200 text-white px-4 py-2 rounded-xl font-bold">Add</button>
              <button onClick={() => setAdding(false)} className="text-xs bg-white hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold border border-gray-200">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-sm text-[#0F3D40] font-black hover:text-[#0C3134] flex items-center gap-2">
            <span className="w-6 h-6 bg-[#EAF3F2] rounded-lg flex items-center justify-center text-base leading-none">+</span>
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

function AnalyticsTab({ appointments }) {
  const [range, setRange] = useState('month')

  const data = useMemo(() => {
    const withDates = appointments.map(a => ({ ...a, _date: getAppointmentDate(a) }))
    const current = getPeriodBounds(range, 0)
    const previous = getPeriodBounds(range, -1)

    const currentList = withDates.filter(a => inRange(a._date, current.start, current.end))
    const previousList = withDates.filter(a => inRange(a._date, previous.start, previous.end))

    const currentRevenue = currentList.reduce((sum, a) => sum + Number.parseFloat(a.price || 0), 0)
    const previousRevenue = previousList.reduce((sum, a) => sum + Number.parseFloat(a.price || 0), 0)

    const firstVisit = {}
    withDates.forEach(a => {
      if (!a.clientPhone) return
      if (!firstVisit[a.clientPhone] || a._date < firstVisit[a.clientPhone]) {
        firstVisit[a.clientPhone] = a._date
      }
    })
    const newClientsCurrent = Object.values(firstVisit).filter(d => inRange(d, current.start, current.end)).length
    const newClientsPrevious = Object.values(firstVisit).filter(d => inRange(d, previous.start, previous.end)).length

    let buckets = []
    if (range === 'week') {
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      buckets = dayLabels.map((label, i) => {
        const dayStart = new Date(current.start); dayStart.setDate(dayStart.getDate() + i)
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
        const prevDayStart = new Date(previous.start); prevDayStart.setDate(prevDayStart.getDate() + i)
        const prevDayEnd = new Date(prevDayStart); prevDayEnd.setDate(prevDayEnd.getDate() + 1)
        return {
          label,
          current: currentList.filter(a => inRange(a._date, dayStart, dayEnd)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
          previous: previousList.filter(a => inRange(a._date, prevDayStart, prevDayEnd)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
        }
      })
    } else if (range === 'month') {
      for (let w = 0; w < 5; w++) {
        const wStart = new Date(current.start); wStart.setDate(wStart.getDate() + w * 7)
        if (wStart >= current.end) break
        const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 7)
        const pStart = new Date(previous.start); pStart.setDate(pStart.getDate() + w * 7)
        const pEnd = new Date(pStart); pEnd.setDate(pEnd.getDate() + 7)
        buckets.push({
          label: `Wk ${w + 1}`,
          current: currentList.filter(a => inRange(a._date, wStart, wEnd < current.end ? wEnd : current.end)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
          previous: previousList.filter(a => inRange(a._date, pStart, pEnd)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
        })
      }
    } else {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      buckets = monthLabels.map((label, i) => {
        const mStart = new Date(current.start.getFullYear(), i, 1)
        const mEnd = new Date(current.start.getFullYear(), i + 1, 1)
        const pStart = new Date(previous.start.getFullYear(), i, 1)
        const pEnd = new Date(previous.start.getFullYear(), i + 1, 1)
        return {
          label,
          current: currentList.filter(a => inRange(a._date, mStart, mEnd)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
          previous: previousList.filter(a => inRange(a._date, pStart, pEnd)).reduce((s, a) => s + Number.parseFloat(a.price || 0), 0),
        }
      })
    }

    const maxBar = Math.max(1, ...buckets.map(b => Math.max(b.current, b.previous)))

    const serviceCounts = {}
    currentList.forEach(a => {
      const name = a.service || 'Unknown'
      serviceCounts[name] = (serviceCounts[name] || 0) + 1
    })
    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    const maxServiceCount = Math.max(1, ...topServices.map(s => s.count))

    return {
      revenue: currentRevenue,
      revenueChange: pctChange(currentRevenue, previousRevenue),
      bookings: currentList.length,
      bookingsChange: pctChange(currentList.length, previousList.length),
      newClients: newClientsCurrent,
      newClientsChange: pctChange(newClientsCurrent, newClientsPrevious),
      buckets,
      maxBar,
      topServices,
      maxServiceCount,
    }
  }, [appointments, range])

  const periodLabel = range === 'week' ? 'vs last week' : range === 'month' ? 'vs last month' : 'vs last year'

  const ChangeBadge = ({ value }) => (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${value >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-lg font-black text-gray-900">Analytics</p>
          <p className="text-xs text-gray-400">Track your business over time</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
          {['week', 'month', 'year'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${range === r ? 'bg-[#0F3D40] text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Revenue</p>
          <p className="text-xl font-black text-[#0F3D40]">${data.revenue.toFixed(0)}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChangeBadge value={data.revenueChange} />
            <span className="text-[10px] text-gray-400">{periodLabel}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Bookings</p>
          <p className="text-xl font-black text-[#0F3D40]">{data.bookings}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChangeBadge value={data.bookingsChange} />
            <span className="text-[10px] text-gray-400">{periodLabel}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">New clients</p>
          <p className="text-xl font-black text-[#0F3D40]">{data.newClients}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChangeBadge value={data.newClientsChange} />
            <span className="text-[10px] text-gray-400">{periodLabel}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-bold text-[#0F3D40]">Revenue by {range === 'week' ? 'day' : range === 'month' ? 'week' : 'month'}</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-[#0F3D40] inline-block" />This {range}</span>
            <span className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-gray-300 inline-block" />Last {range}</span>
          </div>
        </div>
        <div className="flex items-end gap-2 sm:gap-3" style={{ height: '110px' }}>
          {data.buckets.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              <div className="flex items-end gap-0.5 sm:gap-1" style={{ height: '90px' }}>
                <div className="w-2 sm:w-2.5 bg-gray-200 rounded-t" style={{ height: `${(b.previous / data.maxBar) * 100}%` }} />
                <div className="w-2 sm:w-2.5 bg-[#0F3D40] rounded-t" style={{ height: `${(b.current / data.maxBar) * 100}%` }} />
              </div>
              <p className="text-[9px] text-gray-400">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-bold text-[#0F3D40] mb-4">Top services this {range}</p>
        {data.topServices.length === 0 ? (
          <p className="text-xs text-gray-400">No bookings in this period yet.</p>
        ) : (
          <div className="space-y-2.5">
            {data.topServices.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-700 font-semibold w-24 truncate flex-shrink-0">{s.name}</span>
                <div className="flex-1 h-1.5 bg-[#EAF3F2] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0F3D40] rounded-full" style={{ width: `${(s.count / data.maxServiceCount) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function ClientsTab({ appointments, barber, db }) {
  const [notes, setNotes] = useState({})
  const [editingPhone, setEditingPhone] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const clients = useMemo(() => {
    const map = {}
    appointments.forEach(a => {
      const phone = a.clientPhone
      if (!phone) return
      if (!map[phone]) {
        map[phone] = { phone, name: a.clientName, visits: 0, totalSpent: 0, lastVisit: null }
      }
      map[phone].visits += 1
      map[phone].totalSpent += Number.parseFloat(a.price || 0)
      const apptDate = parseAppointmentDate(a.day, a.time)
      if (!map[phone].lastVisit || apptDate > map[phone].lastVisit) {
        map[phone].lastVisit = apptDate
        map[phone].name = a.clientName
      }
    })
    return Object.values(map).sort((a, b) => b.lastVisit - a.lastVisit)
  }, [appointments])

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c => c.name?.toLowerCase().includes(q) || c.phone.includes(q))
  }, [clients, search])

  useEffect(() => {
    if (!barber || clients.length === 0) return
    async function loadNotes() {
      const loaded = {}
      await Promise.all(clients.map(async (c) => {
        const key = `${barber.uid}_${c.phone.replace(/\D/g, '')}`
        try {
          const snap = await getDoc(doc(db, 'clientNotes', key))
          if (snap.exists()) loaded[c.phone] = snap.data().note
        } catch {
          // No note saved yet for this client — expected, not an error worth surfacing.
        }
      }))
      setNotes(loaded)
    }
    loadNotes()
  }, [barber, clients.length])

  async function saveNote(phone) {
    setSaving(true)
    const key = `${barber.uid}_${phone.replace(/\D/g, '')}`
    try {
      await setDoc(doc(db, 'clientNotes', key), {
        barberId: barber.uid,
        phone,
        note: noteDraft,
        updatedAt: new Date(),
      })
      setNotes(prev => ({ ...prev, [phone]: noteDraft }))
      setEditingPhone(null)
    } catch (err) {
      console.error('Failed to save note:', err)
      window.alert('Could not save the note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-3xl mb-3">👥</p>
        <p className="text-sm font-bold text-gray-400">No clients yet</p>
        <p className="text-xs text-gray-300 mt-1">Clients will show up here after their first booking.</p>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search clients by name or phone..."
        className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#0F3D40] transition-all mb-4"
      />

      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm font-bold text-gray-400">No clients match "{search}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((c) => (
            <div key={c.phone} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

              {/* Identity row */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#0F3D40] flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                    {c.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${c.visits >= 3 ? 'bg-[#EAF3F2] text-[#0F3D40]' : 'bg-gray-50 text-gray-400'}`}>
                  {c.visits >= 3 ? 'Regular' : 'New'}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-black text-[#0F3D40]">{c.visits}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">visit{c.visits !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-black text-[#0F3D40]">${c.totalSpent.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">spent</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-sm font-black text-[#0F3D40]">{c.lastVisit?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">last visit</p>
                </div>
              </div>

              {/* Note zone — visually distinct */}
              {editingPhone === c.phone ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="e.g. prefers a fade, always 5 min late..."
                    className="flex-1 text-xs bg-gray-50 border border-gray-100 rounded-xl p-3 outline-none focus:border-[#0F3D40]"
                    rows={2}
                  />
                  <button
                    onClick={() => saveNote(c.phone)}
                    disabled={saving}
                    className="text-xs bg-[#0F3D40] hover:bg-[#0C3134] text-white font-bold px-3 py-2 rounded-xl flex-shrink-0 disabled:opacity-50"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              ) : notes[c.phone] ? (
                <button
                  onClick={() => { setEditingPhone(c.phone); setNoteDraft(notes[c.phone]) }}
                  className="text-left w-full bg-amber-50 border-l-2 border-amber-300 rounded-r-lg px-3 py-2 hover:bg-amber-100 transition-all"
                >
                  <p className="text-xs text-amber-800">📝 {notes[c.phone]}</p>
                </button>
              ) : (
                <button
                  onClick={() => { setEditingPhone(c.phone); setNoteDraft('') }}
                  className="w-full text-left text-xs text-[#0F3D40] font-semibold border border-dashed border-[#D3E5E4] rounded-lg px-3 py-2 hover:bg-[#F3F7F6] transition-all"
                >
                  + Add a note
                </button>
              )}

            </div>
          ))}
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
  const [upcomingFilter, setUpcomingFilter] = useState('today')
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [completedShown, setCompletedShown] = useState(10)
  const [appointmentSearch, setAppointmentSearch] = useState('')

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
    navigator.clipboard.writeText(`${window.location.origin}/${barber.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCancel(id) {
    if (!window.confirm('Cancel this appointment?')) return
    const appointment = appointments.find(item => item.id === id)
    if (!appointment) return
    await runTransaction(db, async (transaction) => {
      ;(appointment.occupiedSlotMinutes || []).forEach(minute => {
        transaction.delete(doc(db, 'bookingSlots', `${barber.uid}_${appointment.dateKey}_${minute}`))
      })
      transaction.delete(doc(db, 'appointments', id))
    })
  }

  const sorted = sortAppointments(appointments)
  const upcomingList = sorted.filter(a => !isPast(a))
  const completedList = sorted.filter(a => isPast(a)).reverse()

  const revenue = completedList.reduce((sum, a) => sum + parseFloat(a.price || 0), 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const todayKey = formatDateKey(new Date())
  const todaysAppointments = sorted.filter(a => a.dateKey === todayKey)
  const todaysRevenue = todaysAppointments.reduce((sum, a) => sum + parseFloat(a.price || 0), 0)
  const nextToday = todaysAppointments.filter(a => !isPast(a))[0]
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const tomorrowKey = formatDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const upcomingFiltered = upcomingList.filter(a => {
    if (upcomingFilter === 'today' && a.dateKey !== todayKey) return false
    if (upcomingFilter === 'tomorrow' && a.dateKey !== tomorrowKey) return false
    if (upcomingFilter === 'week' && getAppointmentDate(a) > weekEnd) return false
    if (appointmentSearch.trim()) {
      const q = appointmentSearch.trim().toLowerCase()
      return a.clientName?.toLowerCase().includes(q) || a.service?.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0F3D40] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const AppointmentRow = ({ a, i, total, isCompleted }) => (
    <div
      className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${i !== total - 1 ? 'border-b border-gray-50' : ''}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${isCompleted ? 'bg-gray-400' : 'bg-[#0F3D40]'}`}>
          {a.clientName?.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold truncate ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{a.clientName}</p>
          <p className="text-xs text-gray-400 truncate">{a.service}</p> 
          <p className="text-xs text-gray-400 font-semibold sm:hidden">{a.day} · {a.time}</p>
        </div>
      </div>
      <div className="text-right hidden sm:block flex-shrink-0">
        <p className={`text-sm font-bold ${isCompleted ? 'text-gray-400' : 'text-gray-700'}`}>{a.time}</p>
        <p className="text-xs text-gray-400">{a.day}</p>
      </div>
     <div className="flex items-center gap-2 flex-shrink-0">
  {a.clientPhone && (
    <a
      href={'tel:' + a.clientPhone}
      onClick={e => e.stopPropagation()}
      className="text-xs bg-[#EAF3F2] hover:bg-[#DDEEED] text-[#0F3D40] font-bold px-3 py-1.5 rounded-full transition-all inline-flex items-center gap-1"
    >
      📞 <span className="hidden sm:inline">Call</span>
    </a>
  )}

  {isCompleted ? (
    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-600 hidden sm:inline-flex">
      ✓ done
    </span>
  ) : (
    <>
      <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#EAF3F2] text-[#0F3D40] hidden sm:inline-flex">
        upcoming
      </span>

      <button
        onClick={() => setRescheduling(a)}
        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-500 font-bold px-3 py-1.5 rounded-full transition-all"
      >
        Reschedule
      </button>

      <button
        onClick={() => handleCancel(a.id)}
        className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-bold px-3 py-1.5 rounded-full transition-all"
      >
        Cancel
      </button>
    </>
  )}
</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F3F7F6]">

      {rescheduling && (
        <RescheduleModal appointment={rescheduling} barber={barber} onClose={() => setRescheduling(null)} onSave={() => setRescheduling(null)} />
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="text-2xl font-black tracking-tight text-gray-900">barb<span className="text-[#0F3D40]">r</span></div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <div className="w-6 h-6 rounded-full bg-[#0F3D40] flex items-center justify-center text-white text-xs font-black">
              {barber?.username?.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-gray-700">@{barber?.username}</span>
          </div>
          <button onClick={handleLogout} className="text-sm border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-2xl text-gray-500 font-semibold transition-all">Log out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">{greeting}, @{barber?.username} 👋</h1>
          <p className="text-gray-400 text-sm">{todayLabel} · Today's overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3F2] flex items-center justify-center text-base mb-2.5">📅</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Today's bookings</p>
            <p className="text-2xl font-black text-[#0F3D40]">{todaysAppointments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3F2] flex items-center justify-center text-base mb-2.5">⏰</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Next appointment</p>
            <p className="text-2xl font-black text-[#0F3D40]">{nextToday ? nextToday.time : '—'}</p>
          </div>
          <div className="bg-[#0F3D40] rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-base mb-2.5">💰</div>
            <p className="text-[10px] text-[#9DC7C8] font-bold uppercase tracking-wider mb-1">Today's revenue</p>
            <p className="text-2xl font-black text-white">${todaysRevenue.toFixed(0)}</p>
          </div>
        </div>

        <div className="bg-[#0F3D40] rounded-3xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[#7FBDBE] font-bold uppercase tracking-wider mb-1">Your booking link</p>
            <p className="text-white font-black text-lg truncate">{window.location.host}/{barber?.username}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={copyLink} className="text-sm bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-2.5 rounded-2xl transition-all">{copied ? '✓ Copied!' : 'Copy link'}</button>
            <button onClick={() => navigate(`/${barber?.username}`)} className="text-sm bg-white text-[#0F3D40] hover:bg-[#F3F7F6] font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm">Preview</button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white border border-gray-100 shadow-sm p-1.5 rounded-2xl w-full overflow-x-auto">
          {['appointments', 'analytics', 'clients', 'services', 'availability', 'profile'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all flex-shrink-0 ${tab === t ? 'bg-[#0F3D40] text-white shadow-md' : 'text-gray-400 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'appointments' && (
          <div className="space-y-4">

            <input
              type="text"
              value={appointmentSearch}
              onChange={e => setAppointmentSearch(e.target.value)}
              placeholder="Search by client name or service..."
              className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#0F3D40] transition-all"
            />

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-50 flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-black text-gray-900">Upcoming</p>
                  <p className="text-xs text-gray-400 mt-1">{upcomingFiltered.length} appointment{upcomingFiltered.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1.5 overflow-x-auto flex-shrink min-w-0">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'tomorrow', label: 'Tomorrow' },
                    { key: 'week', label: 'Week' },
                    { key: 'all', label: 'All' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setUpcomingFilter(f.key)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                        upcomingFilter === f.key ? 'bg-[#0F3D40] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {upcomingFiltered.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="text-sm font-bold text-gray-400">Nothing here</p>
                  <p className="text-xs text-gray-300 mt-1">Try a different filter, or share your booking link.</p>
                </div>
              ) : (
                upcomingFiltered.map((a, i) => (
                  <AppointmentRow key={a.id} a={a} i={i} total={upcomingFiltered.length} isCompleted={false} />
                ))
              )}
            </div>

            {completedList.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setCompletedExpanded(!completedExpanded)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-gray-400 text-xs transition-transform ${completedExpanded ? 'rotate-90' : ''}`}>▸</span>
                    <p className="text-base font-black text-gray-900">Completed</p>
                  </div>
                  <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full">
                    {completedList.length} total{!completedExpanded ? ' · collapsed' : ''}
                  </span>
                </button>
                {completedExpanded && (
                  <>
                    <div className="border-t border-gray-50">
                      {completedList.slice(0, completedShown).map((a, i) => (
                        <AppointmentRow key={a.id} a={a} i={i} total={Math.min(completedShown, completedList.length)} isCompleted={true} />
                      ))}
                    </div>
                    {completedShown < completedList.length && (
                      <button
                        onClick={() => setCompletedShown(completedShown + 10)}
                        className="w-full py-3 text-xs font-bold text-[#0F3D40] hover:bg-gray-50 border-t border-gray-50 transition-all"
                      >
                        Load more ({completedList.length - completedShown} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {tab === 'analytics' && <AnalyticsTab appointments={appointments} />}
        {tab === 'clients' && <ClientsTab appointments={appointments} barber={barber} db={db} />}
        {tab === 'services' && <ServicesTab barber={barber} db={db} auth={auth} setBarber={setBarber} />}
        {tab === 'availability' && <AvailabilityTab barber={barber} db={db} auth={auth} />}
        {tab === 'profile' && <ProfileTab barber={barber} db={db} auth={auth} setBarber={setBarber} />}

      </div>
    </div>
  )
}

export default Dashboard
