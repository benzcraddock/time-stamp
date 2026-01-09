import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, MessageSquare, Database, Check } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState({
    notifications_enabled: true,
    slack_webhook_url: '',
    notion_api_key: '',
    notion_database_id: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') throw error

        if (data) {
          setPreferences({
            notifications_enabled: data.notifications_enabled ?? true,
            slack_webhook_url: data.slack_webhook_url || '',
            notion_api_key: data.notion_api_key || '',
            notion_database_id: data.notion_database_id || '',
          })
        }
      } catch (err) {
        console.error('Error loading preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        notifications_enabled: preferences.notifications_enabled,
        slack_webhook_url: preferences.slack_webhook_url || null,
        notion_api_key: preferences.notion_api_key || null,
        notion_database_id: preferences.notion_database_id || null,
      })

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  const testSlackWebhook = async () => {
    if (!preferences.slack_webhook_url) return

    try {
      await fetch(preferences.slack_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          text: '✅ Time Stamp webhook test successful!',
        }),
      })
      alert('Test message sent! Check your Slack channel.')
    } catch (err) {
      alert('Error sending test message: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-center" style={{ padding: 'var(--space-16)' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '600px' }}>
        <h2 style={{ marginBottom: 'var(--space-8)' }}>Settings</h2>

        {/* Notifications */}
        <section className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Bell size={20} color="var(--accent-primary)" />
            <h3>Notifications</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                Browser Notifications
              </p>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Get notified when timers start, stop, and hit milestones
              </p>
            </div>
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferences.notifications_enabled}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notifications_enabled: e.target.checked,
                  }))
                }
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
            </label>
          </div>
        </section>

        {/* Slack Integration */}
        <section className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <MessageSquare size={20} color="var(--accent-primary)" />
            <h3>Slack Integration</h3>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="slack-webhook">Webhook URL</label>
            <input
              id="slack-webhook"
              type="url"
              className="input"
              placeholder="https://hooks.slack.com/services/..."
              value={preferences.slack_webhook_url}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  slack_webhook_url: e.target.value,
                }))
              }
            />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
              Create an incoming webhook in your Slack workspace settings
            </p>
          </div>

          {preferences.slack_webhook_url && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={testSlackWebhook}
            >
              Test Webhook
            </button>
          )}
        </section>

        {/* Notion Integration */}
        <section className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
            <Database size={20} color="var(--accent-primary)" />
            <h3>Notion Integration</h3>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="notion-key">API Key</label>
            <input
              id="notion-key"
              type="password"
              className="input"
              placeholder="secret_..."
              value={preferences.notion_api_key}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  notion_api_key: e.target.value,
                }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="notion-db">Database ID</label>
            <input
              id="notion-db"
              type="text"
              className="input"
              placeholder="Enter your Notion database ID"
              value={preferences.notion_database_id}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  notion_database_id: e.target.value,
                }))
              }
            />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
              Create a Notion integration and share your database with it
            </p>
          </div>
        </section>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner" />
            ) : saved ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
