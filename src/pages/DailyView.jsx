import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useTimer } from '../contexts/TimerContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import ProjectCard from '../components/ProjectCard'
import AddProjectModal from '../components/AddProjectModal'
import EditTimeModal from '../components/EditTimeModal'
import { Plus, Clock } from 'lucide-react'

export default function DailyView() {
  const {
    projects,
    activeTimer,
    loading,
    getTotalHoursToday,
    getHoursByType,
    formatHours,
    formatElapsedTime,
    stopTracking,
    startTracking,
  } = useTimer()

  const [showAddProject, setShowAddProject] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 'n',
      action: () => setShowAddProject(true),
    },
    {
      key: 's',
      action: () => {
        if (activeTimer) {
          stopTracking()
        } else if (projects.length > 0) {
          // Start tracking on first project if none active
          startTracking(projects[0].id)
        }
      },
    },
    {
      key: 'Escape',
      action: () => {
        setShowAddProject(false)
        setEditingEntry(null)
      },
    },
  ], [activeTimer, projects, startTracking, stopTracking])

  useKeyboardShortcuts(shortcuts)

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="container">
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h2>Today</h2>
          <p style={{ marginTop: 'var(--space-1)' }}>{today}</p>
        </div>

        {activeTimer && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="timer-display active">{formatElapsedTime()}</span>
            </div>
            <button
              className="btn btn-danger"
              onClick={stopTracking}
            >
              Stop Tracking
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-card">
          <div className="stat-label">Total Today</div>
          <div className="stat-value mono">{formatHours(getTotalHoursToday())} hrs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Client Work</div>
          <div className="stat-value mono client">{formatHours(getHoursByType('client'))} hrs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Internal Work</div>
          <div className="stat-value mono internal">{formatHours(getHoursByType('internal'))} hrs</div>
        </div>
      </div>

      {/* Projects list */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Projects</h3>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          <kbd>S</kbd> Start/Stop
          <kbd>N</kbd> New Project
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">
          <Clock size={48} strokeWidth={1} className="empty-state-icon" />
          <h3>No projects yet</h3>
          <p>Create your first project to start tracking time</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={() => setShowAddProject(true)}
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEditTime={(entry) => setEditingEntry({ project, entry })}
            />
          ))}

          <button
            className="add-project-btn"
            onClick={() => setShowAddProject(true)}
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddProject && (
        <AddProjectModal onClose={() => setShowAddProject(false)} />
      )}

      {editingEntry && (
        <EditTimeModal
          project={editingEntry.project}
          entry={editingEntry.entry}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  )
}
