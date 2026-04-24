import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })

  function handleLogin() {
    if (!form.email || !form.password) return
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-tight mb-1">
            barb<span className="text-purple-600">r</span>
          </h1>
          <p className="text-sm text-gray-400">Sign in to your account</p>
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
        <button
          onClick={handleLogin}
          disabled={!form.email || !form.password}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-200 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm mb-4"
        >
          Sign in
        </button>
        <p className="text-center text-xs text-gray-400">
          No account?{' '}
          <span className="text-purple-600 cursor-pointer hover:underline">Sign up free</span>
        </p>
      </div>
    </div>
  )
}

export default Login