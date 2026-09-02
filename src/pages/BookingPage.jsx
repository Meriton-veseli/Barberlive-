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
      <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center px-4">
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
      <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0F3D40] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (step === 'confirmed') {
    const service = barber.services[selectedService]
    return (
      <div className="min-h-screen bg-[#F3F7F6] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-[#0F3D40] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl font-black">✓</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">You're booked!</h2>
            <p className="text-gray-400 text-sm mb-8">See you soon, {form.name.split(' ')[0]}. 👋</p>

            <div className="bg-[#0F3D40] rounded-2xl p-5 text-left space-y-3 mb-6">
              {[
                { label: 'Barber', value: barber.displayName || `@${username}` },
                { label: 'Service', value: service?.name },
                { label: 'Price', value: `$${service?.price}` },
                { label: 'Date', value: `${days[selectedDay]}, ${months[selectedDay]} ${dates[selectedDay]}` },
                { label: 'Time', value: selectedSlot },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-[#7FBDBE] uppercase tracking-wider font-semibold">{label}</span>
                  <span className="text-sm font-bold text-white">{value}</span>
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
            Powered by <span className="text-[#0F3D40] font-black">barbr</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F7F6]">

      {/* Header */}
      <div className="bg-[#0F3D40] px-5 sm:px-6 py-8 sm:py-10 rounded-b-[28px]">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#7FBDBE] text-xs font-semibold mb-1.5">{barber.displayName || `@${username}`} · {barber.location || ''}</p>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mb-1">Book your next cut</h1>
          <p className="text-[#9DC7C8] text-sm">Choose a service, pick a time, done.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Service selection — floating card overlapping header */}
        <div className="bg-white rounded-2xl shadow-lg shadow-[#0F3D40]/10 p-5 -mt-6 relative">
          <p className="text-[#0F3D40] text-xs font-bold mb-3">Choose a service</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {barber.services.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelectedService(i)}
                className={`text-center rounded-xl py-3 px-2 transition-all ${
                  selectedService === i ? 'bg-[#0F3D40]' : 'bg-[#F3F7F6] hover:bg-[#E1E8E7]'
                }`}
              >
                <p className={`text-xs font-bold ${selectedService === i ? 'text-white' : 'text-[#0F3D40]'}`}>{s.name}</p>
                <p className={`text-[11px] mt-0.5 ${selectedService === i ? 'text-[#9DC7C8]' : 'text-gray-400'}`}>{s.duration} min</p>
                <p className={`text-xs font-bold mt-1 ${selectedService === i ? 'text-white' : 'text-[#0F3D40]'}`}>${s.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="pt-5">
          <p className="text-[#0F3D40] text-xs font-bold mb-3">Pick a date</p>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => { if (!isDayOff(i)) { setSelectedDay(i); setSelectedSlot(null) } }}
                className={`flex flex-col items-center py-2.5 rounded-xl text-xs transition-all ${
                  isDayOff(i)
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : selectedDay === i
                    ? 'bg-[#0F3D40] text-white'
                    : 'bg-white border border-[#E1E8E7] text-[#0F3D40] hover:bg-[#F3F7F6]'
                }`}
              >
                <span className={`font-semibold ${selectedDay === i ? 'text-[#7FBDBE]' : 'text-gray-400'}`}>{day}</span>
                <span className="font-bold text-sm mt-0.5">{dates[i]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="pt-5">
          <p className="text-[#0F3D40] text-xs font-bold mb-3">Pick a time</p>
          {isDayOff(selectedDay) ? (
            <div className="py-10 text-center bg-white rounded-2xl border border-[#E1E8E7]">
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
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isBooked
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                        : selectedSlot === slot
                        ? 'bg-[#0F3D40] text-white'
                        : 'bg-white border border-[#E1E8E7] text-[#0F3D40] hover:bg-[#F3F7F6]'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="pt-5">
          <p className="text-[#0F3D40] text-xs font-bold mb-3">Your details</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white border border-[#E1E8E7] rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0F3D40] transition-all"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-white border border-[#E1E8E7] rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#0F3D40] transition-all"
            />
          </div>
        </div>

        {/* Booking summary */}
        {selectedServiceData && selectedSlot && (
          <div className="mt-5 bg-[#0F3D40] rounded-2xl p-4">
            <p className="text-[#7FBDBE] text-[10px] font-bold uppercase tracking-wider mb-2.5">Booking summary</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#CFE3E3] text-xs">{selectedServiceData.name}</span>
              <span className="text-white text-xs font-bold">${selectedServiceData.price}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#CFE3E3] text-xs">{days[selectedDay]}, {months[selectedDay]} {dates[selectedDay]}</span>
              <span className="text-[#CFE3E3] text-xs">{selectedSlot}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={selectedService === null || !selectedSlot || !form.name || !form.phone || loading}
          className="w-full bg-[#0F3D40] hover:bg-[#0C3134] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-all mt-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Confirming...
            </span>
          ) : 'Confirm booking →'}
        </button>

        {bookingError && (
          <p className="text-center text-sm font-medium text-red-600 mt-3" role="alert">{bookingError}</p>
        )}

        <p className="text-center text-xs text-gray-400 py-6">
          Powered by <span className="text-[#0F3D40] font-black">barbr</span>
        </p>

      </div>
    </div>
  )
}

export default BookingPage