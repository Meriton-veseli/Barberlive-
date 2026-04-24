const testimonials = [
  {
    initials: 'JM',
    name: 'Jordan M.',
    role: 'Independent barber, NYC',
    text: 'I used to waste 30 minutes a day managing WhatsApp bookings. Now I just send my link and everything takes care of itself.',
  },
  {
    initials: 'KA',
    name: 'Khalid A.',
    role: 'Barbershop owner, London',
    text: 'My clients love the confirmation texts. No-shows dropped from 3 a week to basically zero since I started using the Pro plan.',
  },
  {
    initials: 'RM',
    name: 'Ricardo M.',
    role: 'Freelance barber, Miami',
    text: 'Setup took me under 5 minutes. My booking page looks professional and my clients actually use it. Game changer.',
  },
]

function Testimonials() {
  return (
    <section className="bg-gray-50 py-20 px-8">
      <p className="text-center text-xs text-purple-600 font-medium tracking-widest uppercase mb-3">
        Reviews
      </p>
      <h2 className="text-center text-3xl font-medium tracking-tight text-gray-900 mb-12">
        Barbers love it
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="text-yellow-400 text-sm mb-3">★★★★★</div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">{t.text}</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600 flex-shrink-0">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Testimonials