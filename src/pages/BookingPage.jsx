import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection, query, where, getDocs,
  addDoc, onSnapshot, deleteDoc, doc
} from 'firebase/firestore'

const timeSlots = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM',
]

const SERVICE_ICONS = ['✂️', '🪒', '💈', '👦', '🧔', '💇']

function BookingPage() {
  const { username } = useParams()
  const [barber, setBarber] = useState(null)
  const [bookedSlots, setBookedSlots] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [step, setStep] = useState('book')
  const [form, setForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [appointmentId, setAppointmentId] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const today = new Date()
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
  const days = week.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }))
  const dates = week.map(d => d.getDate().toString())
  const months = week.map(d => d.toLocaleDateString('en-US', { month: 'short' }))
  const fullDayNames = week.map(d => d.toLocaleDateString('en-US', { weekday: 'long' }))
  const availability = barber?.availability || null

  function isDayOff(i) {
    if (!availability) return false
    const dayConfig = availability[fullDayNames[i]]
    return !dayConfig || !dayConfig.enabled
  }

  function getAvailableSlots() {
    if (!availability) return timeSlots
    const dayConfig = availability[fullDayNames[selectedDay]]
    if (!dayConfig || !dayConfig.enabled) return []
    const start = timeSlots.indexOf(dayConfig.start)
    const end = timeSlots.indexOf(dayConfig.end)
    if (start === -1 || end === -1) return timeSlots
    return timeSlots.slice(start, end + 1)
  }

  useEffect(() => {
    async function fetchBarber() {
      const q = query(collection(db, 'barbers'), where('username', '==', username))
      const snap = await getDocs(q)
      if (snap.empty) { setNotFound(true); return }
      setBarber(snap.docs[0].data())
    }
    fetchBarber()
  }, [username])

  useEffect(() => {
    if (!barber) return
    const q = query(
      collection(db, 'appointments'),
      where('username', '==', username),
      where('day', '==', `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}`)
    )
    const unsub = onSnapshot(q, (snap) => {
      setBookedSlots(snap.docs.map(d => d.data().time))
    })
    return () => unsub()
  }, [barber, selectedDay, username])

  async function handleConfirm() {
    if (selectedService === null || !selectedSlot || !form.name || !form.phone) return
    setLoading(true)
    try {
      const service = barber.services[selectedService]
      const docRef = await addDoc(collection(db, 'appointments'), {
        username,
        clientName: form.name,
        clientPhone: form.phone,
        service: service.name,
        price: service.price,
        time: selectedSlot,
        day: `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}`,
        status: 'upcoming',
        createdAt: new Date(),
      })
      setAppointmentId(docRef.id)
      setStep('confirmed')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!appointmentId) return
    setCancelling(true)
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId))
      setCancelled(true)
      setStep('cancelled')
    } catch (err) {
      console.error(err)
    } finally {
      setCancelling(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">✂️</p>
          <p className="text-gray-900 font-black text-xl mb-2">Page not found</p>
          <p className="text-gray-400 text-sm">This barber page doesn't exist.</p>
        </div>
      </div>
    )
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (step === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-violet-100 p-8 text-center border border-violet-100">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl">✕</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Booking cancelled</h2>
            <p className="text-gray-400 text-sm mb-8">Your appointment has been cancelled and the slot is now available again.</p>
            <button
              onClick={() => {
                setStep('book')
                setSelectedService(null)
                setSelectedSlot(null)
                setForm({ name: '', phone: '' })
                setAppointmentId(null)
                setCancelled(false)
              }}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-lg hover:shadow-violet-200"
            >
              Book a new appointment →
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Powered by <span className="text-violet-600 font-black">barbr</span>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'confirmed') {
    const service = barber.services[selectedService]
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-violet-100 p-8 text-center border border-violet-100">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
              <span className="text-white text-3xl font-black">✓</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">You're booked!</h2>
            <p className="text-gray-400 text-sm mb-8">See you soon, {form.name.split(' ')[0]}. 👋</p>

            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 text-left space-y-3 mb-6 border border-violet-100">
              {[
                { label: 'Barber', value: barber.displayName || `@${username}` },
                { label: 'Service', value: service?.name },
                { label: 'Price', value: `$${service?.price}` },
                { label: 'Date', value: `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}` },
                { label: 'Time', value: selectedSlot },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setStep('book')
                setSelectedService(null)
                setSelectedSlot(null)
                setForm({ name: '', phone: '' })
                setAppointmentId(null)
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-3 rounded-2xl transition-all mb-3"
            >
              Book another appointment
            </button>

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full bg-red-50 hover:bg-red-100 text-red-500 text-sm font-bold py-3 rounded-2xl transition-all border border-red-100"
            >
              {cancelling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  Cancelling...
                </span>
              ) : 'Cancel this booking'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Powered by <span className="text-violet-600 font-black">barbr</span>
          </p>
        </div>
      </div>
    )
  }

  const selectedServiceData = selectedService !== null ? barber.services[selectedService] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <div className="max-w-2xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white flex-shrink-0 shadow-lg shadow-violet-200">
            {username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 mb-0.5">
              {barber.displayName || `@${username}`}
            </h1>
            <p className="text-sm text-violet-500 font-semibold mb-2">@{username}</p>
            {barber.bio && (
              <p className="text-sm text-gray-500 leading-relaxed mb-2">{barber.bio}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {barber.location && (
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  📍 {barber.location}
                </span>
              )}
              {barber.phone && (
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  📞 {barber.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-4">Choose a service</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {barber.services.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelectedService(i)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  selectedService === i
                    ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                    : 'border-gray-100 hover:border-violet-200 bg-gray-50 hover:bg-violet-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{SERVICE_ICONS[i % SERVICE_ICONS.length]}</span>
                  <span className={`text-base font-black ${selectedService === i ? 'text-violet-600' : 'text-gray-700'}`}>
                    ${s.price}
                  </span>
                </div>
                <p className={`text-sm font-bold mb-0.5 ${selectedService === i ? 'text-violet-700' : 'text-gray-900'}`}>
                  {s.name}
                </p>
                <p className="text-xs text-gray-400">{s.duration}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-4">Pick a day</p>
          <div className="grid grid-cols-7 gap-2 mb-6">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => { if (!isDayOff(i)) { setSelectedDay(i); setSelectedSlot(null) } }}
                className={`flex flex-col items-center py-3 rounded-2xl text-xs transition-all ${
                  isDayOff(i)
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : selectedDay === i
                    ? 'bg-gradient-to-b from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-200'
                    : 'bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-600'
                }`}
              >
                <span className="font-bold">{day}</span>
                <span className="font-black text-sm mt-0.5">{dates[i]}</span>
                <span style={{ fontSize: '9px' }} className="opacity-70 mt-0.5">{months[i]}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-4">Pick a time</p>
          {isDayOff(selectedDay) ? (
            <div className="py-10 text-center bg-gray-50 rounded-2xl">
              <p className="text-2xl mb-2">😴</p>
              <p className="text-sm text-gray-400 font-medium">Not available on this day</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {getAvailableSlots().map((slot) => {
                const isBooked = bookedSlots.includes(slot)
                return (
                  <button
                    key={slot}
                    disabled={isBooked}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-3 rounded-2xl text-xs font-bold transition-all ${
                      isBooked
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                        : selectedSlot === slot
                        ? 'bg-gradient-to-b from-violet-600 to-purple-700 text-white shadow-md shadow-violet-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-violet-600 font-black uppercase tracking-widest mb-4">Your details</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:bg-white transition-all"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {selectedServiceData && selectedSlot && (
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-5 text-white shadow-lg shadow-violet-200">
            <p className="text-xs font-black uppercase tracking-widest text-violet-200 mb-3">Booking summary</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-violet-100">{selectedServiceData.name}</span>
              <span className="text-lg font-black">${selectedServiceData.price}</span>
            </div>
            <div className="flex items-center justify-between text-violet-200 text-xs font-medium">
              <span>{days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]}</span>
              <span>{selectedSlot}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={selectedService === null || !selectedSlot || !form.name || !form.phone || loading}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200 hover:-translate-y-0.5"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Confirming...
            </span>
          ) : 'Confirm booking →'}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by <span className="text-violet-600 font-black">barbr</span>
        </p>

      </div>
    </div>
  )
}

export default BookingPage