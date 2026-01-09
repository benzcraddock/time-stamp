import { useState, useEffect, useCallback } from 'react'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isToday,
  isFuture,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTimer } from '../contexts/TimerContext'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
} from 'lucide-react'
import * as XLSX from 'xlsx'

export default function WeeklyView() {
  const { user } = useAuth()
  const { projects, formatHours } = useTimer()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [weekData, setWeekData] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const isCurrentWeek = days.some((d) => isToday(d))

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  // Load week data
  const loadWeekData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      setWeekData(data || [])
    } catch (error) {
      console.error('Error loading week data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, startDate, endDate])

  useEffect(() => {
    loadWeekData()
  }, [loadWeekData])

  // Get hours for a project on a specific day
  const getHoursForDay = (projectId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const entry = weekData.find(
      (e) => e.project_id === projectId && e.date === dateStr
    )
    return entry ? entry.duration_seconds / 3600 : 0
  }

  // Get total hours for a project this week
  const getProjectWeekTotal = (projectId) => {
    return weekData
      .filter((e) => e.project_id === projectId)
      .reduce((sum, e) => sum + e.duration_seconds / 3600, 0)
  }

  // Get total hours for a day
  const getDayTotal = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return weekData
      .filter((e) => e.date === dateStr)
      .reduce((sum, e) => sum + e.duration_seconds / 3600, 0)
  }

  // Get week total
  const getWeekTotal = () => {
    return weekData.reduce((sum, e) => sum + e.duration_seconds / 3600, 0)
  }

  // Get total by project type
  const getTypeTotal = (type) => {
    const projectIds = projects
      .filter((p) => p.project_type === type)
      .map((p) => p.id)
    return weekData
      .filter((e) => projectIds.includes(e.project_id))
      .reduce((sum, e) => sum + e.duration_seconds / 3600, 0)
  }

  // Navigation
  const goToPrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const goToCurrentWeek = () => setCurrentWeek(new Date())

  // Export to CSV
  const exportToCSV = () => {
    const data = projects.map((project) => {
      const row = { Project: project.name, Type: project.project_type }
      days.forEach((day) => {
        row[format(day, 'EEE M/d')] = formatHours(getHoursForDay(project.id, day))
      })
      row['Total'] = formatHours(getProjectWeekTotal(project.id))
      return row
    })

    // Add totals row
    const totalsRow = { Project: 'TOTAL', Type: '' }
    days.forEach((day) => {
      totalsRow[format(day, 'EEE M/d')] = formatHours(getDayTotal(day))
    })
    totalsRow['Total'] = formatHours(getWeekTotal())
    data.push(totalsRow)

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Time')
    XLSX.writeFile(wb, `time-stamp-${format(weekStart, 'yyyy-MM-dd')}.xlsx`)
  }

  // Copy to clipboard (formatted for Notion/Slack)
  const copyToClipboard = () => {
    const weekRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    let text = `📊 **Time Report: ${weekRange}**\n\n`

    // Projects
    projects.forEach((project) => {
      const hours = getProjectWeekTotal(project.id)
      if (hours > 0) {
        const emoji = project.project_type === 'client' ? '💼' : '🏠'
        text += `${emoji} ${project.name}: ${formatHours(hours)} hrs\n`
      }
    })

    text += `\n**Totals:**\n`
    text += `• Client: ${formatHours(getTypeTotal('client'))} hrs\n`
    text += `• Internal: ${formatHours(getTypeTotal('internal'))} hrs\n`
    text += `• **Total: ${formatHours(getWeekTotal())} hrs**\n`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="week-header">
        <div className="week-nav">
          <button className="btn btn-ghost btn-icon" onClick={goToPrevWeek}>
            <ChevronLeft size={18} />
          </button>
          <span className="week-title">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={goToNextWeek}
            disabled={isFuture(addWeeks(weekStart, 1))}
          >
            <ChevronRight size={18} />
          </button>
          {!isCurrentWeek && (
            <button className="btn btn-secondary btn-sm" onClick={goToCurrentWeek}>
              Today
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={copyToClipboard}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="btn btn-primary" onClick={exportToCSV}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-label">Week Total</div>
          <div className="stat-value mono">{formatHours(getWeekTotal())} hrs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Client Work</div>
          <div className="stat-value mono client">
            {formatHours(getTypeTotal('client'))} hrs
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Internal Work</div>
          <div className="stat-value mono internal">
            {formatHours(getTypeTotal('internal'))} hrs
          </div>
        </div>
      </div>

      {/* Time table */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  {days.map((day) => (
                    <th
                      key={day.toISOString()}
                      style={{
                        textAlign: 'right',
                        background: isToday(day)
                          ? 'rgba(139, 92, 246, 0.1)'
                          : undefined,
                      }}
                    >
                      {format(day, 'EEE')}
                      <br />
                      <span style={{ color: 'var(--text-muted)' }}>
                        {format(day, 'M/d')}
                      </span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="project-color-dot"
                          style={{
                            backgroundColor: project.color,
                            width: '8px',
                            height: '8px',
                          }}
                        />
                        {project.name}
                        <span
                          className={`badge badge-${project.project_type}`}
                          style={{ fontSize: '10px' }}
                        >
                          {project.project_type}
                        </span>
                      </div>
                    </td>
                    {days.map((day) => {
                      const hours = getHoursForDay(project.id, day)
                      return (
                        <td
                          key={day.toISOString()}
                          className="mono"
                          style={{
                            textAlign: 'right',
                            color: hours > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                            background: isToday(day)
                              ? 'rgba(139, 92, 246, 0.05)'
                              : undefined,
                          }}
                        >
                          {hours > 0 ? formatHours(hours) : '-'}
                        </td>
                      )
                    })}
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                      }}
                    >
                      {formatHours(getProjectWeekTotal(project.id))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  {days.map((day) => (
                    <td
                      key={day.toISOString()}
                      className="mono"
                      style={{
                        textAlign: 'right',
                        background: isToday(day)
                          ? 'rgba(139, 92, 246, 0.1)'
                          : undefined,
                      }}
                    >
                      {formatHours(getDayTotal(day))}
                    </td>
                  ))}
                  <td
                    className="mono"
                    style={{ textAlign: 'right', fontWeight: 700 }}
                  >
                    {formatHours(getWeekTotal())}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
