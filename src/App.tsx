import { useState, FormEvent } from 'react'
import './App.css'

type Tab = 'login' | 'signup'

interface AuthResponse {
  token: string
  expires_at: string
}

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || 'http://localhost:3001'

export default function App() {
  const [tab, setTab] = useState<Tab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const endpoint = tab === 'login'
      ? `${AUTH_BASE}/api/auth/login`
      : `${AUTH_BASE}/api/auth/signup`

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

      const { token, expires_at } = data as AuthResponse
      localStorage.setItem('opaque_token', token)
      localStorage.setItem('token_expires_at', expires_at)
      setSuccess(
        tab === 'login'
          ? `Welcome back, ${username}! Token stored.`
          : `Account created! Welcome, ${username}!`
      )
      setUsername('')
      setPassword('')
    } catch {
      setError('Could not reach the auth service. Make sure it is running on port 3001.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="card">
        {/* Logo / Brand */}
        <div className="brand">
          <span className="brand-icon">⚖️</span>
          <h1 className="brand-name">LegalAI</h1>
          <p className="brand-tagline">Your intelligent legal assistant</p>
        </div>

        {/* Tabs */}
        <div className="tabs" role="tablist">
          <button
            id="tab-login"
            role="tab"
            aria-selected={tab === 'login'}
            className={`tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccess('') }}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            role="tab"
            aria-selected={tab === 'signup'}
            className={`tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
          >
            Create Account
          </button>
          <div className={`tab-indicator ${tab === 'signup' ? 'right' : 'left'}`} />
        </div>

        {/* Form */}
        <form id="auth-form" className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete={tab === 'login' ? 'username' : 'new-password'}
              placeholder="e.g. john_doe"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div id="error-banner" className="banner banner-error" role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          {success && (
            <div id="success-banner" className="banner banner-success" role="status">
              <span>✓</span> {success}
            </div>
          )}

          <button
            id="submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? <span className="spinner" />
              : tab === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <p className="footer-note">
          {tab === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            id="switch-tab-btn"
            className="link-btn"
            type="button"
            onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
          >
            {tab === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
