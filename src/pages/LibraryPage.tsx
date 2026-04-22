import { Link } from 'react-router-dom'

export default function LibraryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        RapidRead
      </h1>
      <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
        RSVP Speed Reader with Context-Aware Speed
      </p>
      <Link
        to="/settings"
        className="px-4 py-2 rounded-lg text-white"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        Settings
      </Link>
    </div>
  )
}
