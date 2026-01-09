import { useState } from 'react'
import { useTimer } from '../contexts/TimerContext'
import { X } from 'lucide-react'

export default function AddProjectModal({ onClose }) {
  const { createProject } = useTimer()
  const [name, setName] = useState('')
  const [projectType, setProjectType] = useState('client')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      await createProject(name.trim(), projectType)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex items-center justify-between">
          <h3>Add Project</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body flex flex-col gap-4">
            <div className="form-group">
              <label htmlFor="project-name">Project Name</label>
              <input
                id="project-name"
                type="text"
                className="input"
                placeholder="Enter project name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="project-type">Project Type</label>
              <select
                id="project-type"
                className="input select"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
              >
                <option value="client">Client</option>
                <option value="internal">Internal</option>
                <option value="break">Break</option>
              </select>
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || loading}
            >
              {loading ? <span className="spinner" /> : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
