'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import FilterChips from './components/FilterChips'
import HistorySidebar from './components/HistorySidebar'
import AnalyticsPage from './components/AnalyticsPage'
import ReportsPage, { type ReportEntry } from './components/ReportsPage'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chartType?: string
  data?: Record<string, unknown>[]
  columns?: string[]
  insight?: string
  sql?: string
}

interface HistoryItem {
  id: string
  preview: string
  timestamp: Date
  pinned?: boolean
}

type Tab = 'overview' | 'analytics' | 'reports'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports',   label: 'Reports'   },
]

const SUGGESTIONS = [
  { label: '🏆 Top agents by recovery', query: 'Top 10 agents by recovery rate this month' },
  { label: '📊 DPD bucket breakdown',   query: 'How many accounts are in each DPD bucket?' },
  { label: '🤝 PTP by product type',    query: 'PTP conversion rate by product type' },
  { label: '📈 Roll rate — 3 months',   query: 'Roll rates over last 3 months' },
  { label: '📞 Recovery by channel',    query: 'Recovery amount by contact channel' },
  { label: '🇮🇳 इस महीने recovery',     query: 'इस महीने सबसे ज़्यादा recovery किसने की?' },
]

const FILTER_KEYWORDS = [
  'personal loan', 'business loan', 'credit card', 'auto loan',
  '30-60 dpd', '60-90 dpd', '90+ dpd', '1-30 dpd',
  'this month', 'last month', 'hdfc', 'last 3 months',
]

export default function Home() {
  const [tab, setTab]                           = useState<Tab>('overview')
  const [messages, setMessages]                 = useState<Message[]>([])
  const [input, setInput]                       = useState('')
  const [loading, setLoading]                   = useState(false)
  const [sessionId, setSessionId]               = useState<string | null>(null)
  const [filters, setFilters]                   = useState<string[]>([])
  const [history, setHistory]                   = useState<HistoryItem[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [focused, setFocused]                   = useState(false)
  const [reports, setReports]                   = useState<ReportEntry[]>([])
  const [sessions, setSessions]                 = useState<Record<string, Message[]>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Cmd+B to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarCollapsed((p) => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const resetTextarea = () => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
  }

  const saveSession = (id: string | null, msgs: Message[]) => {
    if (!id || msgs.length === 0) return
    setSessions((p) => ({ ...p, [id]: msgs }))
  }

  const handleSend = async (text?: string) => {
    const raw = text ?? input

    // Handle quick query trigger
    const query = raw.startsWith('__quick__')
      ? raw.replace('__quick__', '')
      : raw.trim()

    if (!query || loading) return

    setInput('')
    resetTextarea()
    setTab('overview')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: query }
    let activeId = currentHistoryId

    setMessages((prev) => {
      const updated = [...prev, userMsg]
      if (activeId) saveSession(activeId, updated)
      return updated
    })

    if (messages.length === 0) {
      const id = `${Date.now()}`
      const preview = query.slice(0, 38) + (query.length > 38 ? '…' : '')
      const timestamp = new Date()
      setHistory((p) => [{ id, preview, timestamp }, ...p])
      setCurrentHistoryId(id)
      setSessions((p) => ({ ...p, [id]: [userMsg] }))
      activeId = id
    }

    const t0 = Date.now()

    try {
      const { data: d } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/query`,
        { message: query, session_id: sessionId },
        { timeout: 30000 }
      )

      const duration = Date.now() - t0
      if (!sessionId) setSessionId(d.session_id)

      const found = FILTER_KEYWORDS.filter((k) => query.toLowerCase().includes(k))
      if (found.length) setFilters((p) => [...new Set([...p, ...found])])

      const aiMsg: Message = {
        role: 'assistant',
        content: d.explanation || 'Here are the results.',
        chartType: d.chart_type,
        data: d.data,
        columns: d.columns,
        insight: d.insight,
        sql: d.sql,
      }

      setMessages((prev) => {
        const updated = [...prev, aiMsg]
        if (activeId) saveSession(activeId, updated)
        return updated
      })

      setReports((p) => [{
        id: `${Date.now()}`,
        query,
        sql: d.sql || null,
        chartType: d.chart_type || 'none',
        rowCount: d.row_count || d.data?.length || 0,
        timestamp: new Date(),
        durationMs: duration,
      }, ...p])

    } catch {
      const errMsg: Message = {
        role: 'assistant',
        content: '⚠ Could not reach the backend. Make sure FastAPI is running on port 8000.',
      }
      setMessages((prev) => {
        const updated = [...prev, errMsg]
        if (activeId) saveSession(activeId, updated)
        return updated
      })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSelectHistory = (id: string) => {
    // Handle quick queries
    if (id.startsWith('__quick__')) {
      handleSend(id)
      return
    }
    saveSession(currentHistoryId, messages)
    setCurrentHistoryId(id)
    setMessages(sessions[id] || [])
    setFilters([])
    setSessionId(null)
    setTab('overview')
  }

  const handleNew = async () => {
    saveSession(currentHistoryId, messages)
    if (sessionId) {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reset`,
        { session_id: sessionId }
      ).catch(() => {})
    }
    setMessages([])
    setSessionId(null)
    setFilters([])
    setCurrentHistoryId(null)
    resetTextarea()
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDelete = (id: string) => {
    setHistory((p) => p.filter((h) => h.id !== id))
    setSessions((p) => { const n = { ...p }; delete n[id]; return n })
    if (currentHistoryId === id) {
      setMessages([])
      setCurrentHistoryId(null)
    }
  }

  const handlePin = (id: string) => {
    setHistory((p) =>
      p.map((h) => h.id === id ? { ...h, pinned: !h.pinned } : h)
    )
  }

  const handleReplay = (query: string) => {
    setTab('overview')
    setTimeout(() => handleSend(query), 100)
  }

  const sidebarWidth = sidebarCollapsed ? 52 : 220

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw', overflow: 'hidden',
      background: 'var(--bg)',
    }}>

      {/* ══ HEADER ══ */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 56, flexShrink: 0,
        background: 'rgba(8,11,18,0.96)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              width: 34, height: 34, borderRadius: 11, cursor: 'pointer',
              background: 'linear-gradient(135deg, #7C6AF7 0%, #5A4FE0 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(124,106,247,0.45)',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
          </motion.div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              letterSpacing: '0.14em', color: 'var(--text-1)', lineHeight: 1,
            }}>ASKCN</div>
            <div style={{
              fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.12em',
              marginTop: 2, fontFamily: 'var(--font-body)', fontWeight: 500,
            }}>PORTFOLIO INTELLIGENCE</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 3,
        }}>
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileTap={{ scale: 0.95 }}
              style={{
                position: 'relative',
                padding: '6px 20px', borderRadius: 9,
                fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'color 0.2s',
                background: tab === t.id
                  ? 'linear-gradient(135deg, #7C6AF7, #5A4FE0)'
                  : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-3)',
              }}
            >
              {t.label}
              {t.id === 'reports' && reports.length > 0 && tab !== 'reports' && (
                <span style={{
                  position: 'absolute', top: 4, right: 6,
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#9F97F9',
                }} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}
          />
          <span style={{
            fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)',
            padding: '4px 12px', borderRadius: 99,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
          }}>Oracle 19c · Mock</span>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {tab === 'overview' && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ flexShrink: 0, overflow: 'hidden' }}
            >
              <HistorySidebar
                history={history}
                currentId={currentHistoryId}
                onSelect={handleSelectHistory}
                onNew={handleNew}
                onDelete={handleDelete}
                onPin={handlePin}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">

            {/* ─── OVERVIEW ─── */}
            {tab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <FilterChips
                  filters={filters}
                  onRemove={(f) => setFilters((p) => p.filter((x) => x !== f))}
                />

                <div style={{
                  flex: 1, overflowY: 'auto',
                  padding: '28px 36px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <AnimatePresence mode="wait">
                    {messages.length === 0 && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          minHeight: '52vh',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          style={{ marginBottom: 32, position: 'relative', width: 76, height: 76 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            style={{
                              position: 'absolute', inset: 0, borderRadius: '50%',
                              border: '1.5px solid rgba(124,106,247,0.2)',
                              borderTopColor: '#7C6AF7',
                            }}
                          />
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                            style={{
                              position: 'absolute', inset: 10, borderRadius: '50%',
                              border: '1px solid rgba(124,106,247,0.1)',
                              borderBottomColor: '#9F97F9',
                            }}
                          />
                          <div style={{
                            position: 'absolute', inset: 14, borderRadius: 16,
                            background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 30px rgba(124,106,247,0.4)',
                          }}>
                            <motion.div
                              animate={{ scale: [1, 1.25, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                              style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.95)' }}
                            />
                          </div>
                        </motion.div>

                        <motion.h1
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.22, duration: 0.5 }}
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 52, letterSpacing: '0.07em',
                            color: 'var(--text-1)', textAlign: 'center',
                            lineHeight: 1, marginBottom: 14,
                          }}
                        >
                          ASK YOUR PORTFOLIO
                        </motion.h1>

                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          style={{
                            fontSize: 13, color: 'var(--text-3)', textAlign: 'center',
                            maxWidth: 400, lineHeight: 1.8, marginBottom: 36,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          Natural language analytics for your collections portfolio<br />
                          Ask in English or Hindi · Instant charts · Live Oracle data
                        </motion.p>

                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.38 }}
                          style={{
                            display: 'flex', flexWrap: 'wrap',
                            gap: 8, justifyContent: 'center', maxWidth: 560,
                          }}
                        >
                          {SUGGESTIONS.map((s, i) => (
                            <motion.button
                              key={s.query}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.42 + i * 0.07 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleSend(s.query)}
                              style={{
                                padding: '9px 18px', borderRadius: 99,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-md)',
                                color: 'var(--text-2)', cursor: 'pointer',
                                fontSize: 12, fontFamily: 'var(--font-body)',
                                fontWeight: 500, transition: 'all 0.18s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(124,106,247,0.45)'
                                e.currentTarget.style.color = 'var(--text-1)'
                                e.currentTarget.style.background = 'rgba(124,106,247,0.08)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-md)'
                                e.currentTarget.style.color = 'var(--text-2)'
                                e.currentTarget.style.background = 'var(--bg-2)'
                              }}
                            >
                              {s.label}
                            </motion.button>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {messages.map((msg, i) => (
                      <MessageBubble key={i} message={msg} />
                    ))}
                    {loading && <TypingIndicator />}
                  </div>
                  <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                <div style={{
                  padding: '12px 36px 16px', flexShrink: 0,
                  borderTop: '1px solid var(--border)',
                  background: 'rgba(8,11,18,0.92)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <motion.div
                    animate={{
                      borderColor: focused ? 'rgba(124,106,247,0.65)' : 'rgba(255,255,255,0.09)',
                      boxShadow: focused ? '0 0 0 3px rgba(124,106,247,0.08)' : '0 2px 12px rgba(0,0,0,0.35)',
                    }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', borderRadius: 16,
                      background: 'var(--bg-2)',
                      border: '1px solid rgba(255,255,255,0.09)',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, flexShrink: 0,
                      opacity: focused ? 1 : 0.3, transition: 'opacity 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg viewBox="0 0 22 22" fill="none" width="20" height="20">
                        <circle cx="11" cy="11" r="10" stroke="#7C6AF7" strokeWidth="1.5" />
                        <circle cx="11" cy="11" r="3.5" fill="#7C6AF7" />
                      </svg>
                    </div>

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKey}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="e.g. Top 10 agents by recovery this month, or इस महीने DPD क्या है?"
                      rows={1}
                      style={{
                        flex: 1, background: 'transparent',
                        border: 'none', outline: 'none', resize: 'none',
                        fontSize: 14, color: 'var(--text-1)',
                        lineHeight: '22px', fontFamily: 'var(--font-body)',
                        caretColor: '#7C6AF7',
                        maxHeight: '110px', overflowY: 'auto',
                        padding: 0, margin: 0, display: 'block',
                      }}
                    />

                    <motion.button
                      whileHover={input.trim() && !loading ? { scale: 1.08 } : {}}
                      whileTap={input.trim() && !loading ? { scale: 0.88 } : {}}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      style={{
                        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                        background: input.trim() && !loading
                          ? 'linear-gradient(135deg, #7C6AF7, #5A4FE0)'
                          : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        cursor: input.trim() && !loading ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: input.trim() && !loading ? 1 : 0.22,
                        transition: 'all 0.2s',
                        boxShadow: input.trim() && !loading ? '0 0 24px rgba(124,106,247,0.5)' : 'none',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                      </svg>
                    </motion.button>
                  </motion.div>

                  <div style={{
                    display: 'flex', justifyContent: 'center', gap: 20,
                    marginTop: 8, fontSize: 11, color: 'var(--text-3)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <span>↵ send</span>
                    <span>⇧↵ new line</span>
                    <span>⌘B sidebar</span>
                    <span>🇮🇳 hindi supported</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── ANALYTICS ─── */}
            {tab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
              >
                <AnalyticsPage />
              </motion.div>
            )}

            {/* ─── REPORTS ─── */}
            {tab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
              >
                <ReportsPage entries={reports} onReplay={handleReplay} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 34, flexShrink: 0,
        background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontFamily: 'var(--font-body)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent-2)',
          }}>AGENTIC STARLORDS</span>
          <span style={{ color: 'var(--border-md)' }}>·</span>
          <span style={{ color: 'var(--text-3)' }}>Collections AI 36</span>
          <span style={{ color: 'var(--border-md)' }}>·</span>
          <span style={{ color: 'var(--text-3)' }}>by CreditNirvana</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          © 2026 Team Agentic Starlords · All rights reserved
        </span>
      </footer>

    </div>
  )
}