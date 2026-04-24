import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const defaultServices = [
  { name: 'Haircut', duration: '30 min', price: '25' },
  { name: 'Haircut + Beard', duration: '45 min', price: '35' },
  { name: 'Beard Trim', duration: '20 min', price: '15' },
]

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-tight mb-1">
            barb<span className="text-purple-600">r</span>
          </h1>
          <p className="text-sm text-gray-400">
            {step === 1 ? 'Choose your booking link' : 'Set up your services'}
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-purple-600' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              This will be the link you share with your clients.
            </p>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden mb-2 focus-within:border-purple-400">
              <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-400 border-r border-gray-200">
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
                className="flex-1 px-3 py-2.5 text-sm outline-none"
              />
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mb-3">{usernameError}</p>
            )}
            {username.length >= 3 && !usernameError && (
              <p className="text-xs text-green-600 mb-3">
                barbr.app/{username} is available ✓
              </p>
            )}
            <button
              onClick={checkUsername}
              disabled={!username || checkingUsername}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm mt-2"
            >
              {checkingUsername ? 'Checking...' : 'Continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Add the services you offer. You can edit these later.
            </p>
            <div className="space-y-3 mb-4">
              {services.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Service name"
                    value={s.name}
                    onChange={e => updateService(i, 'name', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                  <input
                    type="text"
                    placeholder="$"
                    value={s.price}
                    onChange={e => updateService(i, 'price', e.target.value)}
                    className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={() => removeService(i)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addService}
              className="text-sm text-purple-600 hover:underline mb-6 block"
            >
              + Add service
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm"
            >
              {loading ? 'Setting up...' : 'Finish setup'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default Onboarding