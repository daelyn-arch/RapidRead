import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <p className="text-2xl mb-8" style={{ color: 'var(--text-primary)' }}>
        Settings — Coming Soon
      </p>
      <Link to="/" style={{ color: 'var(--accent)' }}>
        Back to Library
      </Link>
    </div>
  )
}
