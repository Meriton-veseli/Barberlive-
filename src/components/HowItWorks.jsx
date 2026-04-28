const steps = [
  {
    number: '01',
    icon: '✦',
    title: 'Create your profile',
    description: 'Sign up in seconds. Add your services, set your prices, and define your weekly availability.',
    color: 'from-violet-500 to-purple-600',
    light: 'bg-violet-50',
    tag: 'Takes 60 seconds',
  },
  {
    number: '02',
    icon: '⟡',
    title: 'Share your link',
    description: 'Get your unique barbr.app/your-name link. Drop it in your Instagram bio, WhatsApp, anywhere.',
    color: 'from-fuchsia-500 to-pink-600',
    light: 'bg-fuchsia-50',
    tag: 'One link, everywhere',
  },
  {
    number: '03',
    icon: '◈',
    title: 'Clients book themselves',
    description: 'They pick a service, choose a time, and confirm. The slot locks instantly — no double bookings.',
    color: 'from-indigo-500 to-violet-600',
    light: 'bg-indigo-50',
    tag: 'Real-time locking',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-8 bg-white">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs text-violet-600 font-bold tracking-widest uppercase mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Up and running in<br />
            <span className="text-violet-600">3 simple steps</span>
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">No complicated setup. No tech skills needed. Just you, your link, and happy clients.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative group">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-gray-200 to-transparent z-10 -translate-x-4" />
              )}
              <div className="relative bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-2xl mb-6 shadow-lg`}>
                  {step.icon}
                </div>
                <span className="text-xs font-black text-gray-200 tracking-widest">{step.number}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 mb-3">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">{step.description}</p>
                <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full ${step.light} text-violet-700`}>
                  {step.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

export default HowItWorks