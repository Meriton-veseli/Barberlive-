import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection, query, where, getDocs, onSnapshot, doc, runTransaction, serverTimestamp
} from 'firebase/firestore'

const timeSlots = [
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM',
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
  const [bookingError, setBookingError] = useState('')
  const [notFound, setNotFound] = useState(false)

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
  const selectedServiceData = selectedService !== null ? barber?.services?.[selectedService] : null
  const selectedDate = week[selectedDay]
  const dateKey = formatDateKey(selectedDate)

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

  function isDayOff(i) {
    if (!availability) return false
    const dayConfig = availability[fullDayNames[i]]
    return !dayConfig || !dayConfig.enabled
  }
function getAvailableSlots() {
  const now = new Date()
  const isToday = selectedDay === 0

  let slots = timeSlots

  if (availability) {
    const dayConfig = availability[fullDayNames[selectedDay]]
    if (!dayConfig || !dayConfig.enabled) return []
    const start = timeSlots.indexOf(dayConfig.start)
    const end = timeSlots.indexOf(dayConfig.end)
    if (start === -1 || end === -1) return timeSlots
    slots = timeSlots.slice(start, end + 1)
  }

  const duration = Number.parseInt(selectedServiceData?.duration, 10) || 30
  slots = slots.filter(slot => {
    if (!availability) return true
    const dayConfig = availability[fullDayNames[selectedDay]]
    return slotToMinutes(slot) + duration <= slotToMinutes(dayConfig.end)
  })

  if (isToday) {
    slots = slots.filter(slot => {
      const [time, modifier] = slot.split(' ')
      let [hours, minutes] = time.split(':').map(Number)
      if (modifier === 'PM' && hours !== 12) hours += 12
      if (modifier === 'AM' && hours === 12) hours = 0
      const slotDate = new Date()
      slotDate.setHours(hours, minutes, 0, 0)
      return slotDate > now
    })
  }

  return slots
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
      collection(db, 'bookingSlots'),
      where('barberId', '==', barber.uid),
      where('dateKey', '==', dateKey)
    )
    const unsub = onSnapshot(q, (snap) => {
      setBookedSlots(snap.docs.map(d => d.data().minute))
    })
    return () => unsub()
  }, [barber, dateKey])

  async function handleConfirm() {
    if (selectedService === null || !selectedSlot || !form.name || !form.phone) return
    setLoading(true)
    setBookingError('')
    try {
      const service = barber.services[selectedService]
      const occupiedMinutes = occupiedSlotMinutes(selectedSlot, service.duration)
      const appointmentRef = doc(collection(db, 'appointments'))
      const reservationRefs = occupiedMinutes.map(minute =>
        doc(db, 'bookingSlots', `${barber.uid}_${dateKey}_${minute}`)
      )

      await runTransaction(db, async (transaction) => {
        const reservations = await Promise.all(reservationRefs.map(ref => transaction.get(ref)))
        if (reservations.some(reservation => reservation.exists())) {
          throw new Error('That time was just booked. Please choose another slot.')
        }

        reservationRefs.forEach((ref, index) => transaction.set(ref, {
          barberId: barber.uid,
          dateKey,
          minute: occupiedMinutes[index],
          appointmentId: appointmentRef.id,
        }))
        transaction.set(appointmentRef, {
          barberId: barber.uid,
          username,
          clientName: form.name.trim(),
          clientPhone: form.phone.trim(),
          service: service.name,
          duration: Number.parseInt(service.duration, 10),
          price: service.price,
          time: selectedSlot,
          day: `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}`,
          dateKey,
          occupiedSlotMinutes: occupiedMinutes,
          status: 'upcoming',
          createdAt: serverTimestamp(),
        })
      })
      setStep('confirmed')
    } catch (err) {
      console.error(err)
      setBookingError(err.message === 'That time was just booked. Please choose another slot.'
        ? err.message
        : 'We could not confirm your booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f6f5f8] flex items-center justify-center px-4">
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
      <div className="min-h-screen bg-[#f6f5f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (step === 'confirmed') {
    const service = barber.services[selectedService]
    return (
      <div className="min-h-screen bg-[#f6f5f8] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl shadow-violet-100 p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
              <span className="text-white text-3xl font-black">✓</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">You're booked!</h2>
            <p className="text-gray-400 text-sm mb-8">See you soon, {form.name.split(' ')[0]}. 👋</p>

            <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-6 border border-gray-100">
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
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-3 rounded-2xl transition-all mb-3"
            >
              Book another appointment
            </button>

            <p className="text-center text-xs text-gray-400">Need to cancel? Please contact your barber.</p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Powered by <span className="text-violet-600 font-black">barbr</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f5f8]">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-black text-white">
              {username?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-none">{barber.displayName || `@${username}`}</p>
              <p className="text-[10px] text-gray-400 tracking-wide mt-0.5">@{username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
     <div className="bg-white border-b border-gray-100 px-5 sm:px-6 py-8 sm:py-10">
  <div className="max-w-6xl mx-auto">
    <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-2">Book an appointment</p>
    <h1 className="text-2xl sm:text-4xl font-black text-gray-900 leading-tight mb-3">
      Book your next <span className="text-violet-600">cut</span>
    </h1>
    <p className="text-sm text-gray-500 max-w-md mb-4">
      Choose your service, pick a time, and {barber.displayName || 'we'}'ll take care of the rest.
    </p>
    {barber.bio && (
      <p className="text-xs text-gray-400 mb-3">{barber.bio}</p>
    )}
    <div className="flex items-center gap-2 flex-wrap">
      {barber.location && (
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">📍 {barber.location}</span>
      )}
      {barber.phone && (
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">📞 {barber.phone}</span>
      )}
    </div>
  </div>
</div>

      {/* Two column layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left: booking flow */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Step 1 — Service */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-sm font-black text-gray-900">Choose a service</p>
            </div>
            <p className="text-xs text-gray-400 ml-10 mb-4">Select the service you need</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {barber.services.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedService(i)}
                  className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedService === i
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-100 hover:border-violet-200 bg-white'
                  }`}
                >
                  {selectedService === i && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] flex items-center justify-center">✓</span>
                  )}
                  <span className="text-2xl">{SERVICE_ICONS[i % SERVICE_ICONS.length]}</span>
                  <p className="text-sm font-bold text-gray-900 mt-3 mb-0.5">{s.name}</p>
                  <p className="text-xs text-gray-400 mb-2">⏱ {s.duration} min</p>
                  <p className={`text-base font-black ${selectedService === i ? 'text-violet-600' : 'text-gray-900'}`}>
                    ${s.price}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Date */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-sm font-black text-gray-900">Pick a date</p>
            </div>
            <p className="text-xs text-gray-400 ml-10 mb-4">Select the day that works for you</p>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, i) => (
                <button
                  key={day}
                  onClick={() => { if (!isDayOff(i)) { setSelectedDay(i); setSelectedSlot(null) } }}
                  className={`flex flex-col items-center py-3 rounded-2xl text-xs transition-all ${
                    isDayOff(i)
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : selectedDay === i
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-600'
                  }`}
                >
                  <span className="font-bold">{day}</span>
                  <span className="font-black text-sm mt-0.5">{dates[i]}</span>
                  <span style={{ fontSize: '9px' }} className="opacity-70 mt-0.5">{months[i]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 — Time */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
              <p className="text-sm font-black text-gray-900">Pick a time</p>
            </div>
            <p className="text-xs text-gray-400 ml-10 mb-4">
              Available time slots for {days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]}
            </p>

            {isDayOff(selectedDay) ? (
              <div className="py-10 text-center bg-gray-50 rounded-2xl">
                <p className="text-2xl mb-2">😴</p>
                <p className="text-sm text-gray-400 font-medium">Not available on this day</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {getAvailableSlots().map((slot) => {
                  const isBooked = occupiedSlotMinutes(slot, selectedServiceData?.duration || 30)
                    .some(minute => bookedSlots.includes(minute))
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        isBooked
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through'
                          : selectedSlot === slot
                          ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">🕐 All times shown in your local time</p>
          </div>

          {/* Step 4 — Details */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">4</span>
              <p className="text-sm font-black text-gray-900">Your details</p>
            </div>
            <p className="text-xs text-gray-400 ml-10 mb-4">Enter your information to confirm</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:bg-white transition-all"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📞</span>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-400 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bottom confirm bar */}
          <div className="p-6 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">📅</span>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900">Your booking summary</p>
                {selectedServiceData && selectedSlot ? (
                  <p className="text-xs text-gray-500 truncate">
                    {selectedServiceData.name} · {days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]} at {selectedSlot}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Choose a service, date, and time</p>
                )}
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={selectedService === null || !selectedSlot || !form.name || !form.phone || loading}
              className="flex-shrink-0 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black px-6 py-3 rounded-2xl text-sm transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : 'Confirm booking →'}
            </button>
          </div>

          {bookingError && (
            <p className="text-center text-sm font-medium text-red-600 px-6 pb-4" role="alert">{bookingError}</p>
          )}
        </div>

        {/* Right: live summary sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-black text-violet-600 mb-4">Booking summary</p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">✂️</span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Service</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedServiceData ? selectedServiceData.name : '—'}
                    {selectedServiceData && <span className="text-gray-400 font-medium"> · ${selectedServiceData.price}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">📅</span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date</p>
                  <p className="text-sm font-bold text-gray-900">
                    {days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">🕐</span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Time</p>
                  <p className="text-sm font-bold text-gray-900">{selectedSlot || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">⏱</span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedServiceData ? `${selectedServiceData.duration} min` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">👤</span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                  <p className="text-sm font-bold text-gray-900">{form.name || 'Not provided yet'}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-4 flex items-center justify-between">
              <p className="text-sm font-black text-gray-900">Total</p>
              <p className="text-lg font-black text-violet-600">
                {selectedServiceData ? `$${selectedServiceData.price}` : '—'}
              </p>
            </div>
          </div>

          <div className="bg-violet-50 rounded-3xl p-5 flex items-start gap-3 border border-violet-100">
            <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-sm flex-shrink-0">🛡️</span>
            <div>
              <p className="text-sm font-black text-violet-900 mb-0.5">Secure & Private</p>
              <p className="text-xs text-violet-700 leading-relaxed">We respect your privacy and never share your data.</p>
            </div>
          </div>

          {(barber.location || barber.phone) && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="w-full h-28 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-3xl mb-4">
                💈
              </div>
              <p className="text-sm font-black text-gray-900 mb-1">{barber.displayName || `@${username}`}</p>
              {barber.location && <p className="text-xs text-gray-500 leading-relaxed">📍 {barber.location}</p>}
              {barber.phone && <p className="text-xs text-gray-500 leading-relaxed mt-1">📞 {barber.phone}</p>}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">🔒 Your information is secure and will never be shared.</p>

      {/* Feature strip */}
      <div className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { icon: '📅', title: 'Easy Booking', desc: 'Book in just a few clicks' },
            { icon: '✅', title: 'Instant Confirmation', desc: "You'll know right away" },
            { icon: '💬', title: 'Need Changes?', desc: 'Contact your barber directly' },
            { icon: '🔒', title: 'Private & Secure', desc: 'Your info stays protected' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-xs font-black text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="text-violet-600 font-black">barbr</span>
        </p>
      </div>

    </div>
  )
}

export default BookingPage
