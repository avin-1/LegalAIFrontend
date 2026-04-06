import { useState, useEffect, type FormEvent } from 'react'
import './App.css'
import Dashboard from './Dashboard'

type Tab = 'login' | 'signup'

interface AuthResponse {
  token: string
  expires_at: string
}
const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || 'http://localhost:3000'

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<string>('')
  
  const [tab, setTab] = useState<Tab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const savedToken = localStorage.getItem('opaque_token')
    const savedUser = localStorage.getItem('username')
    const expiry = localStorage.getItem('token_expires_at')

    if (savedToken && savedUser && expiry) {
      if (new Date(expiry) > new Date()) {
        setToken(savedToken)
        setUser(savedUser)
      } else {
        localStorage.clear()
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    setToken(null)
    setUser('')
    setSuccess('Logged out successfully.')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const endpoint = tab === 'login'
      ? `${GATEWAY_BASE}/api/auth/login`
      : `${GATEWAY_BASE}/api/auth/signup`

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'An unexpected error occurred.')
        return
      }

      const { token: newToken, expires_at } = data as AuthResponse
      localStorage.setItem('opaque_token', newToken)
      localStorage.setItem('token_expires_at', expires_at)
      localStorage.setItem('username', username)
      
      setSuccess(
        tab === 'login'
          ? `Authenticated. Redirecting...`
          : `Account provisioned! Redirecting...`
      )
      
      setTimeout(() => {
        setToken(newToken)
        setUser(username)
        setUsername('')
        setPassword('')
        setSuccess('')
      }, 1000)

    } catch {
      setError('Connection refused to API Gateway (port 3000).')
    } finally {
      setLoading(false)
    }
  }

  if (token) {
    return <Dashboard token={token} username={user} onLogout={handleLogout} />
  }

  return (
    <div className="page">
      <div className="auth-card">
        
        <header className="auth-header">
          <h1>LegalAI</h1>
          <p>Enterprise Legal Assistant</p>
        </header>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'login'}
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signup'}
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              autoComplete={tab === 'login' ? 'username' : 'new-password'}
              placeholder="e.g. jdoe_legal"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="banner banner-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          {success && (
            <div className="banner banner-success" role="status">
              <span>✓</span> {success}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Processing...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

      </div>
    </div>
  )
}
