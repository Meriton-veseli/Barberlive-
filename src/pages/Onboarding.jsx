import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const defaultServices = [
  { name: 'Haircut', duration: '30 min', price: '25' },
  { name: 'Haircut + Beard', duration: '45 min', price: '35' },
  { name: 'Beard Trim', duration: '20 min', price: '15' },
]

const inputCls = "w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-all shadow-sm"

function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [services, setServices] = useState(defaultServices)
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
    setServices([...services, { name: '', duration: '30 min', price: '' }])
  }

  function removeService(i) {
    setServices(services.filter((_, idx) => idx !== i))
  }

  async function handleFinish() {
    setLoading(true)
    const user = auth.currentUser
    try {
      const slug = username.toLowerCase()
    await setDoc(doc(db, 'barbers', user.uid), {
  uid: user.uid,
  email: user.email,
  username: slug,
  services,
  availability: {
    Monday:    { enabled: true, start: '9:00 AM', end: '6:00 PM' },
    Tuesday:   { enabled: true, start: '9:00 AM', end: '6:00 PM' },
    Wednesday: { enabled: true, start: '9:00 AM', end: '6:00 PM' },
    Thursday:  { enabled: true, start: '9:00 AM', end: '6:00 PM' },
    Friday:    { enabled: true, start: '9:00 AM', end: '6:00 PM' },
    Saturday:  { enabled: true, start: '9:00 AM', end: '2:00 PM' },
    Sunday:    { enabled: false, start: '9:00 AM', end: '6:00 PM' },
  },
  createdAt: new Date(),
})
      await setDoc(doc(db, 'usernames', slug), { uid: user.uid })
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            barb<span className="text-violet-600">r</span>
          </div>
          <p className="text-gray-400 text-sm">Let's get you set up in 2 quick steps</p>
        </div>

        {/* progress */}
        <div className="flex items-center gap-3 mb-8 max-w-xs mx-auto">
          {[1, 2].map((s, i) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md shadow-violet-200' :
                'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {i < 1 && (
                <div className={`flex-1 h-0.5 rounded-full transition-all ${s < step ? 'bg-violet-600' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          {/* step header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-8 py-6">
            <p className="text-xs text-violet-200 font-bold uppercase tracking-widest mb-1">
              Step {step} of 2
            </p>
            <h2 className="text-xl font-black text-white">
              {step === 1 ? 'Choose your booking link' : 'Set up your services'}
            </h2>
            <p className="text-violet-200 text-sm mt-1">
              {step === 1
                ? 'This is the link you share with your clients.'
                : 'Add your services and prices. You can edit these anytime.'}
            </p>
          </div>

          <div className="p-8">

            {step === 1 && (
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">
                  Your booking URL
                </label>
                <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl overflow-hidden mb-3 focus-within:border-violet-400 transition-all shadow-sm">
                  <span className="px-4 py-3 bg-gray-50 text-sm text-gray-400 font-medium border-r-2 border-gray-100 flex-shrink-0">
                    barbr.app/
                  </span>
                  <input
                    type="text"
                    placeholder="your-name"
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      setUsernameError('')
                    }}
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
                  <p className="text-xs text-violet-600 font-medium">
                    💡 Use your name or business name. Keep it short and easy to share.
                  </p>
                </div>

                <button
                  onClick={checkUsername}
                  disabled={!username || checkingUsername}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200"
                >
                  {checkingUsername ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Checking...
                    </span>
                  ) : 'Continue →'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="space-y-3 mb-4">
                  {services.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center group">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-sm flex-shrink-0">
                        ✂️
                      </div>
                      <input
                        type="text"
                        placeholder="Service name"
                        value={s.name}
                        onChange={e => updateService(i, 'name', e.target.value)}
                        className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:bg-white transition-all"
                      />
                      <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden focus-within:border-violet-400 transition-all">
                        <span className="pl-3 text-sm text-gray-400 font-bold">$</span>
                        <input
                          type="text"
                          placeholder="0"
                          value={s.price}
                          onChange={e => updateService(i, 'price', e.target.value)}
                          className="w-16 px-2 py-2.5 text-sm outline-none bg-transparent font-bold text-gray-700"
                        />
                      </div>
                      <button
                        onClick={() => removeService(i)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-all text-lg flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addService}
                  className="flex items-center gap-2 text-sm text-violet-600 font-black hover:text-violet-700 mb-6 transition-colors"
                >
                  <span className="w-6 h-6 bg-violet-100 hover:bg-violet-200 rounded-lg flex items-center justify-center transition-colors">+</span>
                  Add service
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl text-sm transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-2 flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : 'Finish setup 🎉'}
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