function Hero() {
  return (
    <section className="flex flex-col items-center text-center px-8 py-24 max-w-3xl mx-auto">
      <span className="bg-purple-100 text-purple-600 text-xs font-medium px-4 py-1 rounded-full mb-6">
        Now in beta — free for barbers
      </span>
      <h1 className="text-5xl font-medium tracking-tight text-gray-900 leading-tight mb-5">
        Your booking link,<br />
        <span className="text-purple-600">ready in 60 seconds</span>
      </h1>
      <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
        Give every barber their own booking page. Clients pick a time, you get notified, and the slot locks instantly — no double bookings, ever.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-8 py-3 rounded-lg">
          Start booking for free
        </button>
        <button className="border border-gray-200 hover:bg-gray-50 text-gray-800 text-sm font-medium px-8 py-3 rounded-lg">
          See a live demo
        </button>
      </div>
      <div className="mt-10 bg-gray-50 border border-gray-100 rounded-xl px-6 py-3 flex items-center gap-3">
        <span className="text-sm text-gray-400">Your link:</span>
        <span className="text-sm text-purple-600 font-medium">barbr.app/your-name</span>
        <button className="ml-4 text-xs bg-purple-100 text-purple-600 font-medium px-3 py-1 rounded-md">
          Copy
        </button>
      </div>
    </section>
  )
}

export default Hero