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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-tight mb-1">
            barb<span className="text-purple-600">r</span>
          </h1>
          <p className="text-sm text-gray-400">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        <div className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple-400"
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!form.email || !form.password || loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm mb-4"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
        <p className="text-center text-xs text-gray-400">
          {isSignUp ? 'Already have an account? ' : 'No account? '}
          <span
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-purple-600 cursor-pointer hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up free'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Login