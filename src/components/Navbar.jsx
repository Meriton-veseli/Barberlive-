import { useNavigate } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
      <div className="text-xl font-medium tracking-tight">
        barb<span className="text-purple-600">r</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-800">How it works</a>
        <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-800">Pricing</a>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Login
        </button>
        <button
          onClick={() => navigate('/login')}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2 rounded-lg"
        >
          Get started free
        </button>
      </div>
    </nav>
  )
}

export default Navbar