import { useNavigate } from 'react-router-dom'

function Hero() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-8 overflow-hidden">

      {/* background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50 z-0" />

      {/* decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200 rounded-full blur-3xl opacity-30 z-0" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-20 z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-100 rounded-full blur-3xl opacity-20 z-0" />

      <div className="relative z-10 max-w-4xl mx-auto">

        <div className="inline-flex items-center gap-2 bg-white border border-violet-100 shadow-sm text-violet-600 text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
          Now in beta — free for barbers
        </div>

        <h1 className="text-6xl md:text-7xl font-black tracking-tight text-gray-900 leading-[1.05] mb-6">
          The smartest way<br />
          <span className="relative inline-block">
            <span className="relative z-10 text-violet-600">barbers get booked</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 12" fill="none">
              <path d="M2 9 Q100 2 200 9 Q300 16 398 9" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4"/>
            </svg>
          </span>
        </h1>

        <p className="text-xl text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
          Your own booking page in 60 seconds. Share the link, clients book themselves, slots lock instantly. No more WhatsApp chaos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <button
            onClick={() => navigate('/login')}
            className="group bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:shadow-xl hover:shadow-violet-200 hover:-translate-y-0.5"
          >
            Get your free booking link
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </button>
          <button className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-sm border border-gray-200 transition-all hover:shadow-md">
            See how it works
          </button>
        </div>

        {/* URL demo card */}
        <div className="inline-flex items-center gap-3 bg-white border border-gray-100 shadow-lg rounded-2xl px-6 py-4 mb-14">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="w-px h-5 bg-gray-100" />
          <span className="text-xs text-gray-400">barbr.app/</span>
          <span className="text-sm font-bold text-violet-600">your-name</span>
          <button className="ml-2 text-xs bg-violet-50 hover:bg-violet-100 text-violet-600 font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Copy
          </button>
        </div>

        {/* social proof */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex -space-x-2">
            {['JM', 'KA', 'RM', 'TK', 'SB'].map((i, idx) => (
              <div key={idx} className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                {i[0]}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">500+</span> barbers already booking smarter
          </p>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-sm">★★★★★</span>
            <span className="text-sm font-semibold text-gray-700">4.9</span>
          </div>
        </div>

      </div>
    </section>
  )
}

export default Hero