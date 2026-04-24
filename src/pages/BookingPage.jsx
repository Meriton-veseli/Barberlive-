import { useState } from 'react'
import { useParams } from 'react-router-dom'

const services = [
  { id: 1, name: 'Haircut', duration: '30 min', price: '$25' },
  { id: 2, name: 'Haircut + Beard', duration: '45 min', price: '$35' },
  { id: 3, name: 'Beard Trim', duration: '20 min', price: '$15' },
  { id: 4, name: 'Kids Haircut', duration: '20 min', price: '$18' },
]

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
]

const bookedSlots = ['10:00 AM', '11:30 AM', '2:00 PM']

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dates = ['28', '29', '30', '31', '1', '2']

function BookingPage() {
  const { username } = useParams()
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [step, setStep] = useState('book')
  const [form, setForm] = useState({ name: '', phone: '' })

  function handleConfirm() {
    if (!selectedService || !selectedSlot || !form.name || !form.phone) return
    setStep('confirmed')
  }

  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Booking confirmed!</h2>
          <p className="text-gray-400 text-sm mb-6">You'll receive a confirmation shortly.</p>
          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Barber</span>
              <span className="text-gray-900 font-medium">@{username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Service</span>
              <span className="text-gray-900 font-medium">{services.find(s => s.id === selectedService)?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Day</span>
              <span className="text-gray-900 font-medium">{days[selectedDay]}, Apr {dates[selectedDay]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Time</span>
              <span className="text-gray-900 font-medium">{selectedSlot}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Name</span>
              <span className="text-gray-900 font-medium">{form.name}</span>
            </div>
          </div>
          <button
            onClick={() => { setStep('book'); setSelectedService(null); setSelectedSlot(null); setForm({ name: '', phone: '' }) }}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-medium py-2.5 rounded-lg"
          >
            Book another appointment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-xl font-medium text-purple-600 flex-shrink-0">
            {username?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-medium text-gray-900">@{username}</h1>
            <p className="text-sm text-gray-400">Professional barber · Available this week</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Select a service</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedService === s.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className={`text-sm font-medium mb-1 ${selectedService === s.id ? 'text-purple-700' : 'text-gray-900'}`}>
                  {s.name}
                </p>
                <p className="text-xs text-gray-400">{s.duration} · {s.price}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Select a day</h2>
          <div className="grid grid-cols-6 gap-2 mb-6">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                className={`flex flex-col items-center py-3 rounded-xl border text-xs transition-all ${
                  selectedDay === i
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                <span className="font-medium">{day}</span>
                <span className="text-gray-400 mt-0.5">{dates[i]}</span>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-medium text-gray-900 mb-4">Select a time</h2>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((slot) => {
              const isBooked = bookedSlots.includes(slot)
              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isBooked
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                      : selectedSlot === slot
                      ? 'bg-purple-600 text-white border border-purple-600'
                      : 'border border-gray-100 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Your details</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-400"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedService || !selectedSlot || !form.name || !form.phone}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl text-sm transition-all"
        >
          Confirm booking
        </button>

      </div>
    </div>
  )
}

export default BookingPage