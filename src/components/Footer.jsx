function Footer() {
  return (
    <footer className="px-8 py-6 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
      <div className="text-xl font-medium tracking-tight">
        barb<span className="text-purple-600">r</span>
      </div>
      <div className="flex gap-6">
        <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Privacy</a>
        <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Terms</a>
        <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Support</a>
        <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Twitter</a>
      </div>
    </footer>
  )
}

export default Footer