const testimonials = [
  {
    initials: 'JM',
    name: 'Jordan M.',
    role: 'Independent barber, NYC',
    text: 'I used to waste 30 minutes a day managing WhatsApp bookings. Now I just send my link and everything takes care of itself.',
    gradient: 'from-violet-400 to-purple-600',
  },
  {
    initials: 'KA',
    name: 'Khalid A.',
    role: 'Barbershop owner, London',
    text: 'My clients love the confirmation texts. No-shows dropped from 3 a week to basically zero since I started using the Pro plan.',
    gradient: 'from-fuchsia-400 to-pink-600',
  },
  {
    initials: 'RM',
    name: 'Ricardo M.',
    role: 'Freelance barber, Miami',
    text: 'Setup took me under 5 minutes. My booking page looks professional and my clients actually use it. Game changer.',
    gradient: 'from-indigo-400 to-violet-600',
  },
]

function Testimonials() {
  return (
    <section className="py-28 px-8 bg-white">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs text-violet-600 font-bold tracking-widest uppercase mb-4">Reviews</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Barbers <span className="text-violet-600">love it</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">Don't take our word for it. Here's what real barbers say.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-base">★</span>
                ))}
              </div>

              <p className="text-gray-600 leading-relaxed text-sm flex-1 mb-6">
                "{t.text}"
              </p>

              <div className="flex items-center gap-3 pt-5 border-t border-gray-50">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* stats bar */}
        <div className="mt-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
          {[
            { value: '500+', label: 'Barbers onboarded' },
            { value: '12k+', label: 'Appointments booked' },
            { value: '4.9★', label: 'Average rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-black mb-1">{stat.value}</p>
              <p className="text-violet-200 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default Testimonials