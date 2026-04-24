const steps = [
  {
    number: '1',
    title: 'Create your profile',
    description: 'Sign up, add your services, prices, and set your weekly availability in minutes.',
  },
  {
    number: '2',
    title: 'Share your link',
    description: 'Get your unique booking URL. Share it on Instagram, WhatsApp, or wherever your clients are.',
  },
  {
    number: '3',
    title: 'Clients book themselves',
    description: 'They pick a service and time. You get notified. The slot locks automatically.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-20 px-8">
      <p className="text-center text-xs text-purple-600 font-medium tracking-widest uppercase mb-3">
        How it works
      </p>
      <h2 className="text-center text-3xl font-medium tracking-tight text-gray-900 mb-12">
        Up and running in 3 steps
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {steps.map((step) => (
          <div key={step.number} className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600 mb-4">
              {step.number}
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HowItWorks