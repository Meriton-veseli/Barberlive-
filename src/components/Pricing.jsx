const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect to get started',
    features: ['1 barber profile', 'Booking page + link', 'Up to 30 bookings/mo', 'Email confirmations'],
    featured: false,
    cta: 'Get started free',
    badge: null,
  },
  {
    name: 'Pro',
    price: '$12',
    description: 'For serious barbers',
    features: ['Unlimited bookings', 'SMS reminders', 'No-show protection', 'Analytics dashboard', 'Custom booking page'],
    featured: true,
    cta: 'Start free trial',
    badge: 'Most popular',
  },
  {
    name: 'Shop',
    price: '$29',
    description: 'For barbershops',
    features: ['Up to 10 barbers', 'Team dashboard', 'Priority support', 'Everything in Pro'],
    featured: false,
    cta: 'Contact us',
    badge: null,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs text-violet-600 font-bold tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">No hidden fees. No surprises. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 ${
                plan.featured
                  ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl shadow-violet-200 scale-105'
                  : 'bg-white border border-gray-100 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  ⚡ {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <p className={`text-sm font-bold mb-2 ${plan.featured ? 'text-violet-200' : 'text-gray-400'}`}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-5xl font-black tracking-tight ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-2 ${plan.featured ? 'text-violet-200' : 'text-gray-400'}`}>/mo</span>
                </div>
                <p className={`text-sm ${plan.featured ? 'text-violet-200' : 'text-gray-400'}`}>
                  {plan.description}
                </p>
              </div>

              <div className={`w-full h-px mb-6 ${plan.featured ? 'bg-violet-500' : 'bg-gray-100'}`} />

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      plan.featured ? 'bg-violet-500 text-white' : 'bg-green-100 text-green-600'
                    }`}>
                      ✓
                    </span>
                    <span className={plan.featured ? 'text-violet-100' : 'text-gray-500'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  plan.featured
                    ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-lg'
                    : 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-lg hover:shadow-violet-200'
                }`}
              >
                {plan.cta} →
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>

      </div>
    </section>
  )
}

export default Pricing