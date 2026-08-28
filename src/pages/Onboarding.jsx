import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const defaultServices = [
  { name: 'Haircut', duration: 30, price: '25' },
  { name: 'Haircut + Beard', duration: 45, price: '35' },
  { name: 'Beard Trim', duration: 20, price: '15' },
]

const DURATIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

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
  Monday:    { enabled: true,  start: '9:00 AM', end: '6:00 PM' },
  Tuesday:   { enabled: true,  start: '9:00 AM', end: '6:00 PM' },
  Wednesday: { enabled: true,  start: '9:00 AM', end: '6:00 PM' },
  Thursday:  { enabled: true,  start: '9:00 AM', end: '6:00 PM' },
  Friday:    { enabled: true,  start: '9:00 AM', end: '6:00 PM' },
  Saturday:  { enabled: true,  start: '9:00 AM', end: '2:00 PM' },
  Sunday:    { enabled: false, start: '9:00 AM', end: '6:00 PM' },
}

const STEP_LABELS = ['Booking link', 'Services', 'Availability']

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [services, setServices] = useState(defaultServices)
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY)
  const [loading, setLoading] = useState(false)

  async function checkUsername() {
    if (!username || username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      return
    }
    setCheckingUsername(true)
    setUsernameError('')
    const ref = doc(db, 'usernames', username.toLowerCase())
    const snap = await getDoc(ref)
    if (snap.exists()) {
      setUsernameError('This username is already taken')
      setCheckingUsername(false)
      return
    }
    setCheckingUsername(false)
    setStep(2)
  }

  function updateService(i, field, value) {
    const updated = [...services]
    updated[i][field] = value
    setServices(updated)
  }

  function addService() {
    setServices([...services, { name: '', duration: 30, price: '' }])
  }

  function removeService(i) {
    setServices(services.filter((_, idx) => idx !== i))
  }

  function updateAvailability(day, field, value) {
    setAvailability(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleFinish() {
    setLoading(true)
    const user = auth.currentUser
    try {
      const slug = username.toLowerCase()
     await setDoc(doc(db, 'barbers', user.uid), {
       uid: user.uid,
       username: slug,
       services,
       availability,
       createdAt: new Date(),
    })
    await setDoc(doc(db, 'barberPrivate', user.uid), {
       email: user.email,
    })
      await setDoc(doc(db, 'usernames', slug), { uid: user.uid })
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const stepTitles = [
    'Choose your booking link',
    'Set up your services',
    'Set your availability',
  ]
  const stepSubtitles = [
    'This is the link you share with your clients.',
    'Add your services, prices and how long each takes.',
    'Set the days and hours clients can book you.',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            barb<span className="text-violet-600">r</span>
          </div>
          <p className="text-gray-400 text-sm">Let's get you set up in 3 quick steps</p>
        </div>

        {/* progress */}
        <div className="flex items-center gap-2 mb-8 max-w-sm mx-auto">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md shadow-violet-200' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${s === step ? 'text-violet-600' : 'text-gray-300'}`}>
                  {STEP_LABELS[s - 1]}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 rounded-full mb-4 transition-all ${s < step ? 'bg-violet-600' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-8 py-6">
            <p className="text-xs text-violet-200 font-bold uppercase tracking-widest mb-1">Step {step} of 3</p>
            <h2 className="text-xl font-black text-white">{stepTitles[step - 1]}</h2>
            <p className="text-violet-200 text-sm mt-1">{stepSubtitles[step - 1]}</p>
          </div>

          <div className="p-8">

            {/* Step 1 - Username */}
            {step === 1 && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Your booking URL</label>
                <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl overflow-hidden mb-3 focus-within:border-violet-400 transition-all shadow-sm">
                  <span className="px-4 py-3 bg-gray-50 text-sm text-gray-400 font-medium border-r-2 border-gray-100 flex-shrink-0">
                    barbr.app/
                  </span>
                  <input
                    type="text"
                    placeholder="your-name"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setUsernameError('') }}
                    onKeyDown={e => e.key === 'Enter' && checkUsername()}
                    className="flex-1 px-4 py-3 text-sm outline-none font-bold text-violet-600"
                  />
                </div>
                {usernameError && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-2.5 mb-4">
                    <p className="text-xs text-red-500 font-medium">⚠️ {usernameError}</p>
                  </div>
                )}
                {username.length >= 3 && !usernameError && (
                  <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-2.5 mb-4">
                    <p className="text-xs text-green-600 font-bold">✓ barbr.app/{username} is available!</p>
                  </div>
                )}
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-6">
                  <p className="text-xs text-violet-600 font-medium">💡 Use your name or business name. Keep it short and easy to share.</p>
                </div>
                <button
                  onClick={checkUsername}
                  disabled={!username || checkingUsername}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200"
                >
                  {checkingUsername ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Checking...</span> : 'Continue →'}
                </button>
              </div>
            )}

            {/* Step 2 - Services */}
            {step === 2 && (
              <div>
                <div className="space-y-3 mb-4">
                  {services.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">✂️</div>
                      <input
                        type="text"
                        placeholder="Service name"
                        value={s.name}
                        onChange={e => updateService(i, 'name', e.target.value)}
                        className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:bg-white transition-all min-w-0"
                      />
                      <select
                        value={s.duration}
                        onChange={e => updateService(i, 'duration', Number(e.target.value))}
                        className="bg-gray-50 border-2 border-gray-100 rounded-2xl px-2 py-2.5 text-sm outline-none focus:border-violet-400 text-gray-700 font-medium"
                      >
                        {DURATIONS.map(d => (
                          <option key={d} value={d}>{d} min</option>
                        ))}
                      </select>
                      <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-violet-400 transition-all">
                        <span className="pl-3 text-sm text-gray-400 font-bold">$</span>
                        <input
                          type="text"
                          placeholder="0"
                          value={s.price}
                          onChange={e => updateService(i, 'price', e.target.value)}
                          className="w-14 px-2 py-2.5 text-sm outline-none bg-transparent font-bold text-gray-700"
                        />
                      </div>
                      <button
                        onClick={() => removeService(i)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-all text-lg flex-shrink-0"
                      >×</button>
                    </div>
                  ))}
                </div>

                <button onClick={addService} className="flex items-center gap-2 text-sm text-violet-600 font-black hover:text-violet-700 mb-6 transition-colors">
                  <span className="w-6 h-6 bg-violet-100 hover:bg-violet-200 rounded-lg flex items-center justify-center transition-colors">+</span>
                  Add service
                </button>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl text-sm transition-all">← Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200">
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 - Availability */}
            {step === 3 && (
              <div>
                <div className="space-y-2 mb-6">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${availability[day]?.enabled ? 'bg-violet-50 border border-violet-100' : 'bg-gray-50 border border-gray-100'}`}>
                      <div className="w-24 flex items-center gap-2 flex-shrink-0">
                        <div
                          onClick={() => updateAvailability(day, 'enabled', !availability[day]?.enabled)}
                          className={`w-10 h-6 rounded-full cursor-pointer transition-all relative flex-shrink-0 ${availability[day]?.enabled ? 'bg-violet-600' : 'bg-gray-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${availability[day]?.enabled ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className={`text-sm font-bold ${availability[day]?.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                          {day.slice(0, 3)}
                        </span>
                      </div>
                      {availability[day]?.enabled ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={availability[day]?.start}
                            onChange={e => updateAvailability(day, 'start', e.target.value)}
                            className="text-xs bg-white border-2 border-violet-100 rounded-xl px-2 py-1.5 text-gray-700 outline-none focus:border-violet-400"
                          >
                            {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                          <span className="text-gray-400 text-xs font-bold">→</span>
                          <select
                            value={availability[day]?.end}
                            onChange={e => updateAvailability(day, 'end', e.target.value)}
                            className="text-xs bg-white border-2 border-violet-100 rounded-xl px-2 py-1.5 text-gray-700 outline-none focus:border-violet-400"
                          >
                            {ALL_SLOTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Day off</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl text-sm transition-all">← Back</button>
                  <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200"
                  >
                    {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting up...</span> : 'Finish setup 🎉'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By continuing you agree to our{' '}
          <span className="text-violet-600 font-semibold cursor-pointer">Terms</span> and{' '}
          <span className="text-violet-600 font-semibold cursor-pointer">Privacy Policy</span>
        </p>

      </div>
    </div>
  )
}

export default Onboarding