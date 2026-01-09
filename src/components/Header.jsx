import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Calendar, Settings, LogOut, ChevronDown } from 'lucide-react'

export default function Header() {
  const { user, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.email) return '?'
    return user.email.charAt(0).toUpperCase()
  }

  return (
    <header className="app-header">
      <div className="app-logo">
        <Clock size={24} strokeWidth={1.5} color="var(--accent-primary)" />
        <span>Time Stamp</span>
      </div>

      <nav className="app-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Clock size={16} />
            Today
          </span>
        </NavLink>
        <NavLink
          to="/weekly"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} />
            Weekly
          </span>
        </NavLink>
      </nav>

      <div className="user-menu" ref={menuRef}>
        <button
          className="user-menu-trigger"
          onClick={() => setShowMenu(!showMenu)}
        >
          <div className="user-avatar">{getInitials()}</div>
          <ChevronDown size={14} color="var(--text-secondary)" />
        </button>

        {showMenu && (
          <div className="user-menu-dropdown">
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderBottom: '1px solid var(--border-primary)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)'
            }}>
              {user?.email}
            </div>
            <NavLink
              to="/settings"
              className="user-menu-item"
              onClick={() => setShowMenu(false)}
            >
              <Settings size={14} />
              Settings
            </NavLink>
            <button
              className="user-menu-item danger"
              onClick={handleSignOut}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
