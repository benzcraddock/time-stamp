import { useState } from 'react'
import { useTimer } from '../contexts/TimerContext'
import { X, AlertTriangle } from 'lucide-react'

export default function EditTimeModal({ project, entry, onClose }) {
  const { updateTimeEntry, formatHours } = useTimer()

  // Convert seconds to hours for the input
  const currentHours = entry ? (entry.duration_seconds / 3600) : 0
  const [hours, setHours] = useState(currentHours.toFixed(2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newHours = parseFloat(hours)
    if (isNaN(newHours) || newHours < 0) {
      setError('Please enter a valid number of hours')
      return
    }

    // Require confirmation for significant changes
    if (!confirmed && Math.abs(newHours - currentHours) > 0.5) {
      setConfirmed(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      const newDurationSeconds = Math.round(newHours * 3600)
      await updateTimeEntry(entry.id, newDurationSeconds)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHoursChange = (e) => {
    setHours(e.target.value)
    setConfirmed(false) // Reset confirmation if user changes value
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex items-center justify-between">
          <h3>Edit Time</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ marginBottom: 'var(--space-4)' }}>
              Editing time for <strong>{project.name}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="hours">Hours</label>
              <input
                id="hours"
                type="number"
                step="0.01"
                min="0"
                className="input time-edit-input"
                value={hours}
                onChange={handleHoursChange}
                autoFocus
              />
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
                marginTop: 'var(--space-2)',
                textAlign: 'center'
              }}>
                Current: {formatHours(currentHours)} hrs
              </p>
            </div>

            {confirmed && (
              <div className="time-edit-warning">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Confirm change</strong>
                  <p style={{ margin: 0, marginTop: 'var(--space-1)' }}>
                    You're changing the time by more than 30 minutes. Click save again to confirm.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div style={{
                color: 'var(--error)',
                fontSize: 'var(--text-sm)',
                marginTop: 'var(--space-4)'
              }}>
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
              className={`btn ${confirmed ? 'btn-danger' : 'btn-primary'}`}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : confirmed ? (
                'Confirm Save'
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
