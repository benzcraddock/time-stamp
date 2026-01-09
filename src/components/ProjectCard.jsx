import { useState, useRef, useEffect } from 'react'
import { useTimer } from '../contexts/TimerContext'
import { Play, Square, Pencil, Trash2, MoreVertical } from 'lucide-react'

export default function ProjectCard({ project, onEditTime }) {
  const {
    activeTimer,
    timeEntries,
    startTracking,
    stopTracking,
    updateProject,
    deleteProject,
    getProjectHoursToday,
    formatHours,
    elapsedSeconds,
  } = useTimer()

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)

  const isActive = activeTimer?.project_id === project.id
  const hours = getProjectHoursToday(project.id)
  const entry = timeEntries.find(e => e.project_id === project.id)

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveName = async () => {
    if (name.trim() && name !== project.name) {
      await updateProject(project.id, { name: name.trim() })
    } else {
      setName(project.name)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      setName(project.name)
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (confirmDelete) {
      await deleteProject(project.id)
      setShowMenu(false)
    } else {
      setConfirmDelete(true)
    }
  }

  const handleToggleTimer = () => {
    if (isActive) {
      stopTracking()
    } else {
      startTracking(project.id)
    }
  }

  const getBadgeClass = () => {
    switch (project.project_type) {
      case 'client': return 'badge-client'
      case 'internal': return 'badge-internal'
      case 'break': return 'badge-break'
      default: return 'badge-client'
    }
  }

  return (
    <div className={`project-card fade-in ${isActive ? 'active' : ''}`}>
      {/* Color dot */}
      <div
        className="project-color-dot"
        style={{ backgroundColor: project.color }}
      />

      {/* Project info */}
      <div className="project-info">
        <div className="project-name">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <>
              <span>{project.name}</span>
              {isActive && <span className="pulse-dot" />}
            </>
          )}
        </div>
        <div className="project-meta">
          <span className={`badge ${getBadgeClass()}`}>
            {project.project_type}
          </span>
        </div>
      </div>

      {/* Hours display */}
      <div
        className="project-hours mono"
        onClick={() => entry && onEditTime(entry)}
        style={{ cursor: entry ? 'pointer' : 'default' }}
        title={entry ? 'Click to edit time' : ''}
      >
        {formatHours(hours)} hrs
      </div>

      {/* Actions */}
      <div className="project-actions">
        <button
          className={`btn ${isActive ? 'btn-danger' : 'btn-success'} btn-icon`}
          onClick={handleToggleTimer}
          title={isActive ? 'Stop tracking' : 'Start tracking'}
        >
          {isActive ? <Square size={16} /> : <Play size={16} />}
        </button>

        <div className="user-menu" ref={menuRef}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="user-menu-dropdown">
              <button
                className="user-menu-item"
                onClick={() => {
                  setIsEditing(true)
                  setShowMenu(false)
                }}
              >
                <Pencil size={14} />
                Rename
              </button>
              {entry && (
                <button
                  className="user-menu-item"
                  onClick={() => {
                    onEditTime(entry)
                    setShowMenu(false)
                  }}
                >
                  <Pencil size={14} />
                  Edit Time
                </button>
              )}
              <button
                className={`user-menu-item danger`}
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                {confirmDelete ? 'Click to confirm' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
