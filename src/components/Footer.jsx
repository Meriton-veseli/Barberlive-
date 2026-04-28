import { useNavigate } from 'react-router-dom'

function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="bg-gray-950 text-white px-8 pt-20 pb-10">
      <div className="max-w-5xl mx-auto">

        {/* CTA banner */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-10 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Ready to fill your calendar?</h2>
          <p className="text-violet-200 mb-8 max-w-md mx-auto">Join hundreds of barbers who stopped chasing clients and started focusing on the cut.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-violet-700 hover:bg-violet-50 font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:shadow-xl"
          >
            Get your free booking link →
          </button>
        </div>

        {/* footer links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-black tracking-tight">
            barb<span className="text-violet-400">r</span>
          </div>
          <div className="flex gap-8">
            {['Privacy', 'Terms', 'Support', 'Twitter'].map(link => (
              <a key={link} href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                {link}
              </a>
            ))}
          </div>
          <p className="text-sm text-gray-600">© 2025 Barbr. All rights reserved.</p>
        </div>

      </div>
    </footer>
  )
}

export default Footer