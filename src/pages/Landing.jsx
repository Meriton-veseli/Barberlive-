import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Pricing from '../components/Pricing'
import Testimonials from '../components/Testimonials'
import Footer from '../components/Footer'

function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <Footer />
    </div>
  )
}

export default Landing