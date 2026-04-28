import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!form.email || !form.password) return
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, form.email, form.password)
        navigate('/onboarding')
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* left panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #a855f7 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)' }}
        />
        <div className="relative z-10">
          <div className="text-3xl font-black text-white tracking-tight">
            barb<span className="text-violet-300">r</span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="space-y-6 mb-12">
            {[
              { icon: '✂️', text: 'Your own booking page in 60 seconds' },
              { icon: '📅', text: 'Real-time slot locking, no double bookings' },
              { icon: '💰', text: 'Track revenue and upcoming appointments' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-lg flex-shrink-0">
                  {item.icon}
                </div>
                <p className="text-white/80 text-sm font-medium">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/20">
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              "I used to lose 30 minutes a day on WhatsApp bookings. Now I just share my link and clients do the rest."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xs font-black">JM</div>
              <div>
                <p className="text-white text-sm font-bold">Jordan M.</p>
                <p className="text-white/50 text-xs">Independent barber, NYC</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* right panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <div className="w-full max-w-sm">

          <div className="lg:hidden text-center mb-10">
            <div className="text-3xl font-black tracking-tight text-gray-900">
              barb<span className="text-violet-600">r</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Start getting booked in 60 seconds.' : 'Sign in to your barbr dashboard.'}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4">
              <p className="text-xs text-red-500 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!form.email || !form.password || loading}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-sm mb-5 transition-all hover:shadow-xl hover:shadow-violet-200 hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Please wait...
              </span>
            ) : isSignUp ? 'Create account →' : 'Sign in →'}
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gradient-to-br from-violet-50 via-white to-purple-50 px-3 text-xs text-gray-400 font-medium">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
            </div>
          </div>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="w-full bg-white border-2 border-gray-100 hover:border-violet-200 hover:bg-violet-50 text-gray-700 font-bold py-3 rounded-2xl text-sm transition-all"
          >
            {isSignUp ? 'Sign in instead' : 'Sign up free'}
          </button>

        </div>
      </div>

    </div>
  )
}

export default Login