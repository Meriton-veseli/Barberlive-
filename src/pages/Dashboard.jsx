import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const appointments = [
  { id: 1, name: 'Alex Johnson', service: 'Haircut', time: '9:00 AM', day: 'Mon, Apr 28', status: 'upcoming' },
  { id: 2, name: 'Marcus Lee', service: 'Haircut + Beard', time: '10:30 AM', day: 'Mon, Apr 28', status: 'upcoming' },
  { id: 3, name: 'Tyler Brown', service: 'Beard Trim', time: '12:00 PM', day: 'Tue, Apr 29', status: 'upcoming' },
  { id: 4, name: 'James White', service: 'Haircut', time: '2:00 PM', day: 'Tue, Apr 29', status: 'upcoming' },
  { id: 5, name: 'Chris Davis', service: 'Kids Haircut', time: '9:30 AM', day: 'Wed, Apr 30', status: 'completed' },
  { id: 6, name: 'Ryan Miller', service: 'Haircut + Beard', time: '11:00 AM', day: 'Wed, Apr 30', status: 'completed' },
]

const services = [
  { id: 1, name: 'Haircut', duration: '30 min', price: '$25' },
  { id: 2, name: 'Haircut + Beard', duration: '45 min', price: '$35' },
  { id: 3, name: 'Beard Trim', duration: '20 min', price: '$15' },
  { id: 4, name: 'Kids Haircut', duration: '20 min', price: '$18' },
]

function Dashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('appointments')
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText('barbr.app/john-the-barber')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="text-xl font-medium tracking-tight">
          barb<span className="text-purple-600">r</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">@john-the-barber</span>
          <button
            onClick={() => navigate('/')}
            className="text-sm border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg text-gray-600"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Total bookings</p>
            <p className="text-3xl font-medium text-gray-900">24</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">This week</p>
            <p className="text-3xl font-medium text-gray-900">6</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Est. revenue</p>
            <p className="text-3xl font-medium text-gray-900">$180</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Your booking link</p>
            <p className="text-sm text-purple-600 font-medium">barbr.app/john-the-barber</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-600 font-medium px-4 py-2 rounded-lg"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={() => navigate('/john-the-barber')}
              className="text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg"
            >
              Preview
            </button>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['appointments', 'services', 'availability'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'appointments' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {appointments.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  i !== appointments.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600 flex-shrink-0">
                    {a.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.service}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{a.time}</p>
                  <p className="text-xs text-gray-400">{a.day}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  a.status === 'upcoming'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'services' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {services.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-6 py-4 ${
                  i !== services.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.duration}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{s.price}</span>
                  <button className="text-xs border border-gray-200 hover:bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg">
                    Edit
                  </button>
                </div>
              </div>
            ))}
            <div className="px-6 py-4 border-t border-gray-50">
              <button className="text-sm text-purple-600 font-medium hover:underline">
                + Add service
              </button>
            </div>
          </div>
        )}

        {tab === 'availability' && (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-sm font-medium text-gray-900 mb-4">Weekly availability</p>
            <div className="space-y-3">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-700 w-28">{day}</span>
                  <div className="flex items-center gap-3">
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none">
                      <option>9:00 AM</option>
                      <option>10:00 AM</option>
                      <option>11:00 AM</option>
                    </select>
                    <span className="text-gray-300 text-xs">to</span>
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none">
                      <option>5:00 PM</option>
                      <option>6:00 PM</option>
                      <option>7:00 PM</option>
                    </select>
                    <button className="text-xs text-red-400 hover:text-red-500">Off</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg">
              Save availability
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default Dashboard