const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect to get started',
    features: ['1 barber profile', 'Booking page + link', 'Up to 30 bookings/mo', 'Email confirmations'],
    featured: false,
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '$12',
    description: 'For serious barbers',
    features: ['Unlimited bookings', 'SMS reminders', 'No-show protection', 'Analytics dashboard', 'Custom booking page'],
    featured: true,
    cta: 'Start free trial',
  },
  {
    name: 'Shop',
    price: '$29',
    description: 'For barbershops',
    features: ['Up to 10 barbers', 'Team dashboard', 'Priority support', 'Everything in Pro'],
    featured: false,
    cta: 'Contact us',
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-20 px-8">
      <p className="text-center text-xs text-purple-600 font-medium tracking-widest uppercase mb-3">
        Pricing
      </p>
      <h2 className="text-center text-3xl font-medium tracking-tight text-gray-900 mb-12">
        Simple, honest pricing
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-white rounded-xl p-6 flex flex-col ${
              plan.featured
                ? 'border-2 border-purple-600'
                : 'border border-gray-100'
            }`}
          >
            {plan.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-4 py-1 rounded-full whitespace-nowrap">
                Most popular
              </div>
            )}
            <p className="text-sm text-gray-500 font-medium mb-2">{plan.name}</p>
            <p className="text-4xl font-medium tracking-tight text-gray-900 mb-1">
              {plan.price}
              <span className="text-sm font-normal text-gray-400"> / month</span>
            </p>
            <p className="text-sm text-gray-400 pb-4 mb-4 border-b border-gray-100">
              {plan.description}
            </p>
            <ul className="flex flex-col gap-2 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full block" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                plan.featured
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'border border-gray-200 hover:bg-gray-50 text-gray-800'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Pricing