import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface DashboardProps {
  token: string
  username: string
  onLogout: () => void
}

interface Message {
  role: 'user' | 'ai'
  text: string
  timestamp: string
}

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || 'http://localhost:3000'

export default function Dashboard({ token, username, onLogout }: DashboardProps) {
  const [query, setQuery] = useState('')
  const [responses, setResponses] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [fileName, setFileName] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    // Check global Redis state for active document upon logging in
    const fetchActiveDoc = async () => {
      try {
        const res = await fetch(`${GATEWAY_BASE}/upload?userid=${username}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.filename) {
            setFileName(data.filename)
            setStatus('Success: Loaded active document.')
          }
        }
      } catch (err) {
        console.error("Failed to fetch active document", err)
      }
    }
    fetchActiveDoc()
  }, [token, username])

  useEffect(() => {
    scrollToBottom()
  }, [responses, loading])

  const getFormatTime = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(new Date())
  }

  const submitQuery = async (userQuery: string) => {
    if (!userQuery.trim() || loading) return

    const time = getFormatTime()
    setResponses(prev => [...prev, { role: 'user', text: userQuery, timestamp: time }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${GATEWAY_BASE}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams({
          query: userQuery,
          userid: username // Backend now correctly extracts UUID from JWT, but we still send this strictly
        })
      })

      const data = await res.json()
      const replyTime = getFormatTime()
      
      if (res.ok) {
        setResponses(prev => [...prev, { role: 'ai', text: data.response || 'No response from AI.', timestamp: replyTime }])
      } else {
        setResponses(prev => [...prev, { role: 'ai', text: `Error: ${data.error || 'Failed to get response'}`, timestamp: replyTime }])
      }
    } catch (err) {
      setResponses(prev => [...prev, { role: 'ai', text: 'Error: Could not connect to the Backend API.', timestamp: getFormatTime() }])
    } finally {
      setLoading(false)
    }
  }

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitQuery(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitQuery(query)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setUploading(true)
    setStatus('Uploading and processing...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('userid', username)

    try {
      const res = await fetch(`${GATEWAY_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await res.json()
      if (res.ok) {
        setStatus('Success: Document indexed successfully.')
      } else {
        setStatus(`Error: ${data.error || 'Upload failed'}`)
        setFileName('')
      }
    } catch (err) {
      setStatus('Error: Could not reach the API.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = '' // reset
      }
    }
  }

  return (
    <div className="dashboard-layout">
      {/* LEFT SIDEBAR (Knowledge Base & User) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="brand-icon">⚖️</span>
          <h2>LegalAI Base</h2>
        </div>
        
        <div className="sidebar-content">
          <div className="upload-panel">
            <h3>Knowledge Base</h3>
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpload} 
                style={{ display: 'none' }} 
                accept=".pdf,.doc,.docx,.txt"
              />
              <div className="upload-icon">📄</div>
              <p>{uploading ? 'Processing...' : 'Upload Document'}</p>
            </div>
            {fileName && !uploading && status.startsWith('Success') && (
              <div className="active-file">
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Document:</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent-base)', marginTop: '4px' }}>
                  {fileName}
                </div>
              </div>
            )}
            {status && (
             <div className={`status-message ${status.startsWith('Error') ? 'error' : 'success'}`}>
               {status}
             </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-tray">
            <div className="user-name" title={username}>{username}</div>
            <button onClick={onLogout} className="btn-logout" title="Logout">Log out</button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="chat-main">
        <div className="chat-history">
          {responses.length === 0 ? (
            <div className="empty-state">
              <h1>How can I help you today?</h1>
              <p>Upload a legal document to the Knowledge Base on the left, then ask me questions about its provisions, clauses, or obligations.</p>
            </div>
          ) : (
            responses.map((r, i) => (
              <div key={i} className="chat-row">
                <div className={`chat-bubble-wrapper ${r.role}`}>
                  {r.role === 'ai' && (
                    <div className="avatar ai-avatar">⚖️</div>
                  )}
                  <div className="msg-meta">
                    <div className="chat-bubble">
                      <ReactMarkdown>{r.text}</ReactMarkdown>
                    </div>
                    <span className="timestamp">{r.timestamp}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="chat-row">
              <div className="chat-bubble-wrapper ai">
                <div className="avatar ai-avatar">⚖️</div>
                <div className="msg-meta">
                  <div className="chat-bubble">
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          <form className="chat-input-container" onSubmit={handleQuerySubmit}>
            <textarea 
              className="chat-input"
              placeholder="Message LegalAI..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
            />
            <button 
              type="submit" 
              className="chat-submit-btn"
              disabled={loading || !query.trim()}
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
