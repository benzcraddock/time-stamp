import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TimerProvider } from './contexts/TimerContext'
import Header from './components/Header'
import Auth from './pages/Auth'
import DailyView from './pages/DailyView'
import WeeklyView from './pages/WeeklyView'
import Settings from './pages/Settings'
import './App.css'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return children
}

// App layout with header
function AppLayout({ children }) {
  return (
    <>
      <Header />
      <main className="app-main">
        {children}
      </main>
    </>
  )
}

// Main app content
function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TimerProvider>
              <AppLayout>
                <DailyView />
              </AppLayout>
            </TimerProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/weekly"
        element={
          <ProtectedRoute>
            <TimerProvider>
              <AppLayout>
                <WeeklyView />
              </AppLayout>
            </TimerProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <TimerProvider>
              <AppLayout>
                <Settings />
              </AppLayout>
            </TimerProvider>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
