import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { startOfDay, format } from 'date-fns'

const TimerContext = createContext({})

const NOTIFICATION_MILESTONES = [30, 60, 120, 180, 240] // minutes

export function TimerProvider({ children }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [activeTimer, setActiveTimer] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)
  const notifiedMilestones = useRef(new Set())

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Send browser notification
  const sendNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        tag: 'time-stamp',
      })
    }
  }, [])

  // Check for milestone notifications
  const checkMilestones = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60)
    for (const milestone of NOTIFICATION_MILESTONES) {
      if (minutes >= milestone && !notifiedMilestones.current.has(milestone)) {
        notifiedMilestones.current.add(milestone)
        const hours = milestone >= 60 ? `${milestone / 60} hour${milestone >= 120 ? 's' : ''}` : `${milestone} minutes`
        sendNotification('Time Milestone', `You've been tracking for ${hours}`)
      }
    }
  }, [sendNotification])

  // Load projects and entries
  const loadData = useCallback(async () => {
    if (!user) {
      setProjects([])
      setTimeEntries([])
      setActiveTimer(null)
      setLoading(false)
      return
    }

    try {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: true })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

      // Load today's time entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)

      if (entriesError) throw entriesError
      setTimeEntries(entriesData || [])

      // Load active timer
      const { data: timerData, error: timerError } = await supabase
        .from('active_timers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (timerError && timerError.code !== 'PGRST116') throw timerError

      if (timerData) {
        setActiveTimer(timerData)
        const startTime = new Date(timerData.start_time)
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setElapsedSeconds(elapsed)
        notifiedMilestones.current.clear()
      } else {
        setActiveTimer(null)
        setElapsedSeconds(0)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load data on user change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Timer tick
  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(activeTimer.start_time)
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        setElapsedSeconds(elapsed)
        checkMilestones(elapsed)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setElapsedSeconds(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [activeTimer, checkMilestones])

  // Midnight reset check
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        loadData()
      }
    }

    const midnightInterval = setInterval(checkMidnight, 60000) // Check every minute
    return () => clearInterval(midnightInterval)
  }, [loadData])

  // Create project
  const createProject = async (name, projectType = 'client') => {
    if (!user) return null

    const color = projectType === 'client'
      ? '#8b5cf6'
      : projectType === 'internal'
        ? '#22c55e'
        : '#6b7280'

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        project_type: projectType,
        color,
      })
      .select()
      .single()

    if (error) throw error
    setProjects(prev => [...prev, data])
    return data
  }

  // Update project
  const updateProject = async (projectId, updates) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    setProjects(prev => prev.map(p => p.id === projectId ? data : p))
    return data
  }

  // Delete project
  const deleteProject = async (projectId) => {
    const { error } = await supabase
      .from('projects')
      .update({ archived: true })
      .eq('id', projectId)

    if (error) throw error
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  // Start tracking
  const startTracking = async (projectId) => {
    if (!user) return

    // Stop any existing timer first
    if (activeTimer) {
      await stopTracking()
    }

    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const { data, error } = await supabase
      .from('active_timers')
      .insert({
        user_id: user.id,
        project_id: projectId,
        start_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    setActiveTimer(data)
    setElapsedSeconds(0)
    notifiedMilestones.current.clear()
    sendNotification('Timer Started', `Now tracking: ${project.name}`)
  }

  // Stop tracking
  const stopTracking = async () => {
    if (!user || !activeTimer) return

    const project = projects.find(p => p.id === activeTimer.project_id)
    const startTime = new Date(activeTimer.start_time)
    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

    // Check if there's an existing entry for this project today
    const existingEntry = timeEntries.find(e =>
      e.project_id === activeTimer.project_id && e.date === today
    )

    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          duration_seconds: existingEntry.duration_seconds + durationSeconds,
          end_time: endTime.toISOString(),
        })
        .eq('id', existingEntry.id)
        .select()
        .single()

      if (error) throw error
      setTimeEntries(prev => prev.map(e => e.id === existingEntry.id ? data : e))
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          project_id: activeTimer.project_id,
          date: today,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .select()
        .single()

      if (error) throw error
      setTimeEntries(prev => [...prev, data])
    }

    // Delete active timer
    const { error: deleteError } = await supabase
      .from('active_timers')
      .delete()
      .eq('id', activeTimer.id)

    if (deleteError) throw deleteError

    setActiveTimer(null)
    setElapsedSeconds(0)
    notifiedMilestones.current.clear()

    if (project) {
      sendNotification('Timer Stopped', `Stopped tracking: ${project.name}`)
    }
  }

  // Update time entry manually
  const updateTimeEntry = async (entryId, newDurationSeconds) => {
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        duration_seconds: newDurationSeconds,
        is_manual: true,
      })
      .eq('id', entryId)
      .select()
      .single()

    if (error) throw error
    setTimeEntries(prev => prev.map(e => e.id === entryId ? data : e))
    return data
  }

  // Get hours for a project today
  const getProjectHoursToday = useCallback((projectId) => {
    const entry = timeEntries.find(e => e.project_id === projectId)
    let totalSeconds = entry?.duration_seconds || 0

    // Add elapsed time if this project is being tracked
    if (activeTimer?.project_id === projectId) {
      totalSeconds += elapsedSeconds
    }

    return totalSeconds / 3600
  }, [timeEntries, activeTimer, elapsedSeconds])

  // Get total hours today
  const getTotalHoursToday = useCallback(() => {
    let totalSeconds = timeEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)

    if (activeTimer) {
      totalSeconds += elapsedSeconds
    }

    return totalSeconds / 3600
  }, [timeEntries, activeTimer, elapsedSeconds])

  // Get hours by project type
  const getHoursByType = useCallback((type) => {
    const projectIds = projects
      .filter(p => p.project_type === type)
      .map(p => p.id)

    let totalSeconds = timeEntries
      .filter(e => projectIds.includes(e.project_id))
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0)

    if (activeTimer && projectIds.includes(activeTimer.project_id)) {
      totalSeconds += elapsedSeconds
    }

    return totalSeconds / 3600
  }, [projects, timeEntries, activeTimer, elapsedSeconds])

  // Format hours for display
  const formatHours = (hours) => {
    return hours.toFixed(2)
  }

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = useCallback(() => {
    const hours = Math.floor(elapsedSeconds / 3600)
    const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    const seconds = elapsedSeconds % 60

    const pad = (n) => n.toString().padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }, [elapsedSeconds])

  const value = {
    projects,
    timeEntries,
    activeTimer,
    elapsedSeconds,
    loading,
    createProject,
    updateProject,
    deleteProject,
    startTracking,
    stopTracking,
    updateTimeEntry,
    getProjectHoursToday,
    getTotalHoursToday,
    getHoursByType,
    formatHours,
    formatElapsedTime,
    refreshData: loadData,
  }

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}
