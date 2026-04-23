'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import FilterChips from './components/FilterChips'
import HistorySidebar from './components/HistorySidebar'
import AnalyticsPage from './components/AnalyticsPage'
import ReportsPage, { type ReportEntry } from './components/ReportsPage'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  chartType?: string
  data?: Record<string, unknown>[]
  columns?: string[]
  insight?: string
  sql?: string
  title?: string
}

interface HistoryItem {
  id: string
  preview: string
  timestamp: Date
  pinned?: boolean
}

type Tab = 'overview' | 'analytics' | 'reports'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',  icon: '💬' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'reports',   label: 'Reports',   icon: '📋' },
]

const SUGGESTIONS = [
  { label: '🏆 Top agents',     query: 'Top 10 agents by recovery rate this month' },
  { label: '📊 DPD buckets',    query: 'How many accounts are in each DPD bucket?' },
  { label: '🤝 PTP by product', query: 'PTP conversion rate by product type' },
  { label: '📈 Roll rates',     query: 'Roll rates over last 3 months' },
  { label: '📞 By channel',     query: 'Recovery amount by contact channel' },
  { label: '🇮🇳 Hindi',         query: 'इस महीने सबसे ज़्यादा recovery किसने की?' },
]

const FILTER_KEYWORDS = [
  'personal loan', 'business loan', 'credit card', 'auto loan',
  '30-60 dpd', '60-90 dpd', '90+ dpd', 'this month', 'last month',
]

function mapResponse(d: Record<string, unknown>): Omit<Message, 'role'> {
  const chart    = (d.chart as Record<string, unknown>) || {}
  const chartData = (chart.data as Record<string, unknown>[]) || []
  const chartType = (chart.chart_type as string) || 'none'
  const xKey      = chart.x_key as string | null
  const yKeys     = (chart.y_keys as string[]) || []

  let columns: string[] = []
  if (xKey && yKeys.length > 0) columns = [xKey, ...yKeys]
  else if (chartData.length > 0) columns = Object.keys(chartData[0])

  return {
    content:   (d.answer as string) || 'Here are the results.',
    chartType: chartType === 'none' ? undefined : chartType,
    data:      chartData.length > 0 ? chartData : undefined,
    columns:   columns.length > 0 ? columns : undefined,
    sql:       (d.sql as string) || undefined,
    title:     (chart.title as string) || undefined,
  }
}

// ── useBreakpoint hook ────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return {
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  }
}

export default function Home() {
  const { isMobile, isTablet } = useBreakpoint()
  const isSmall = isMobile || isTablet

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
  const [sidebarOpen, setSidebarOpen]           = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Cmd+B toggle sidebar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        if (isSmall) setSidebarOpen((p) => !p)
        else setSidebarCollapsed((p) => !p)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isSmall])

  // Close mobile sidebar on tab change
  useEffect(() => { if (isSmall) setSidebarOpen(false) }, [tab, isSmall])

  const resetTextarea = () => {
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const saveSession = (id: string | null, msgs: Message[]) => {
    if (!id || msgs.length === 0) return
    setSessions((p) => ({ ...p, [id]: msgs }))
  }

  const handleSend = useCallback(async (text?: string) => {
    const raw   = text ?? input
    const query = raw.startsWith('__quick__') ? raw.replace('__quick__', '') : raw.trim()
    if (!query || loading) return

    setInput('')
    resetTextarea()
    setTab('overview')
    if (isSmall) setSidebarOpen(false)
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
      setHistory((p) => [{ id, preview, timestamp: new Date() }, ...p])
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
      if (d.session_id) setSessionId(d.session_id)

      const found = FILTER_KEYWORDS.filter((k) => query.toLowerCase().includes(k))
      if (found.length) setFilters((p) => [...new Set([...p, ...found])])

      const aiMsg: Message = { role: 'assistant', ...mapResponse(d) }
      setMessages((prev) => {
        const updated = [...prev, aiMsg]
        if (activeId) saveSession(activeId, updated)
        return updated
      })

      const chart = (d.chart as Record<string, unknown>) || {}
      setReports((p) => [{
        id: `${Date.now()}`,
        query,
        sql: (d.sql as string) || null,
        chartType: (chart.chart_type as string) || 'none',
        rowCount: (d.rows_returned as number) || 0,
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
  }, [input, loading, messages.length, sessionId, currentHistoryId, isSmall])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSelectHistory = (id: string) => {
    if (id.startsWith('__quick__')) { handleSend(id); return }
    saveSession(currentHistoryId, messages)
    setCurrentHistoryId(id)
    setMessages(sessions[id] || [])
    setFilters([])
    setSessionId(null)
    setTab('overview')
    if (isSmall) setSidebarOpen(false)
  }

  const handleNew = async () => {
    saveSession(currentHistoryId, messages)
    if (sessionId) await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/reset`, { session_id: sessionId }).catch(() => {})
    setMessages([]); setSessionId(null); setFilters([]); setCurrentHistoryId(null)
    resetTextarea()
    if (isSmall) setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDelete = (id: string) => {
    setHistory((p) => p.filter((h) => h.id !== id))
    setSessions((p) => { const n = { ...p }; delete n[id]; return n })
    if (currentHistoryId === id) { setMessages([]); setCurrentHistoryId(null) }
  }

  const handlePin    = (id: string) => setHistory((p) => p.map((h) => h.id === id ? { ...h, pinned: !h.pinned } : h))
  const handleReplay = (query: string) => { setTab('overview'); setTimeout(() => handleSend(query), 100) }

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
        padding: `0 ${isMobile ? '14px' : '24px'}`,
        height: isMobile ? 48 : 56, flexShrink: 0,
        background: 'rgba(8,11,18,0.96)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 50,
        gap: isMobile ? 8 : 0,
      }}>

        {/* Left — hamburger (mobile) + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
          {/* Hamburger — mobile only */}
          {isMobile && tab === 'overview' && (
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              style={{
                width: 34, height: 34, borderRadius: 9, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4, flexShrink: 0,
              }}
            >
              {[0,1,2].map((i) => (
                <div key={i} style={{ width: 16, height: 1.5, background: 'var(--text-3)', borderRadius: 2 }} />
              ))}
            </button>
          )}

          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{
              width: isMobile ? 28 : 34, height: isMobile ? 28 : 34,
              borderRadius: isMobile ? 9 : 11, cursor: 'pointer', flexShrink: 0,
              background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124,106,247,0.4)',
            }}
          >
            <div style={{ width: isMobile ? 8 : 10, height: isMobile ? 8 : 10, borderRadius: '50%', background: '#fff' }} />
          </motion.div>

          {!isMobile && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.14em', color: 'var(--text-1)', lineHeight: 1 }}>ASKCN</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.12em', marginTop: 2, fontFamily: 'var(--font-body)' }}>PORTFOLIO INTELLIGENCE</div>
            </div>
          )}
          {isMobile && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.12em', color: 'var(--text-1)' }}>ASKCN</span>
          )}
        </div>

        {/* Center — tab switcher */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: isMobile ? 10 : 12, padding: isMobile ? 2 : 3,
        }}>
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileTap={{ scale: 0.93 }}
              style={{
                position: 'relative',
                padding: isMobile ? '5px 10px' : '6px 18px',
                borderRadius: isMobile ? 8 : 9,
                fontSize: isMobile ? 11 : 12,
                fontFamily: 'var(--font-body)', fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'linear-gradient(135deg, #7C6AF7, #5A4FE0)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-3)',
                whiteSpace: 'nowrap',
              }}
            >
              {isMobile ? t.icon : t.label}
              {t.id === 'reports' && reports.length > 0 && tab !== 'reports' && (
                <span style={{ position: 'absolute', top: 3, right: 4, width: 5, height: 5, borderRadius: '50%', background: '#9F97F9' }} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Right — status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}
          />
          {!isMobile && (
            <span style={{
              fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)',
              padding: '4px 10px', borderRadius: 99,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              whiteSpace: 'nowrap',
            }}>Oracle 19c · Live</span>
          )}
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        {/* Sidebar */}
        {tab === 'overview' && (
          <motion.div
            key="sidebar"
            initial={false}
            animate={isMobile
              ? { x: sidebarOpen ? 0 : -280 }
              : { width: sidebarCollapsed ? 52 : 220, opacity: 1 }
            }
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={isMobile ? {
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 260, zIndex: 45,
              boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,0.5)' : 'none',
            } : {
              flexShrink: 0, overflow: 'hidden',
              width: sidebarCollapsed ? 52 : 220,
            }}
          >
            <HistorySidebar
              history={history}
              currentId={currentHistoryId}
              onSelect={handleSelectHistory}
              onNew={handleNew}
              onDelete={handleDelete}
              onPin={handlePin}
              collapsed={!isMobile && sidebarCollapsed}
              onToggleCollapse={() => {
                if (isMobile) setSidebarOpen(false)
                else setSidebarCollapsed((p) => !p)
              }}
            />
          </motion.div>
        )}

        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">

            {/* ─── OVERVIEW ─── */}
            {tab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <FilterChips
                  filters={filters}
                  onRemove={(f) => setFilters((p) => p.filter((x) => x !== f))}
                />

                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: 'auto',
                  padding: `20px ${isMobile ? '14px' : '28px'}`,
                  display: 'flex', flexDirection: 'column',
                }}>
                  <AnimatePresence mode="wait">
                    {messages.length === 0 && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          minHeight: isMobile ? '45vh' : '52vh',
                        }}
                      >
                        {/* Logo mark */}
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.7 }}
                          style={{ marginBottom: 24, position: 'relative', width: isMobile ? 60 : 76, height: isMobile ? 60 : 76 }}
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
                          <div style={{
                            position: 'absolute', inset: isMobile ? 10 : 14, borderRadius: 14,
                            background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 24px rgba(124,106,247,0.4)',
                          }}>
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity }}
                              style={{ width: isMobile ? 10 : 14, height: isMobile ? 10 : 14, borderRadius: '50%', background: '#fff' }}
                            />
                          </div>
                        </motion.div>

                        <motion.h1
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: isMobile ? 32 : 48, letterSpacing: '0.07em',
                            color: 'var(--text-1)', textAlign: 'center',
                            lineHeight: 1, marginBottom: 12,
                          }}
                        >
                          ASK YOUR PORTFOLIO
                        </motion.h1>

                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.28 }}
                          style={{
                            fontSize: isMobile ? 12 : 13, color: 'var(--text-3)',
                            textAlign: 'center', maxWidth: 340,
                            lineHeight: 1.8, marginBottom: 28,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          {isMobile
                            ? 'Ask in English or Hindi · Instant charts'
                            : 'Natural language analytics for your collections portfolio\nAsk in English or Hindi · Instant charts · Live Oracle data'
                          }
                        </motion.p>

                        {/* Suggestion chips */}
                        <div style={{
                          display: 'flex', flexWrap: 'wrap',
                          gap: 7, justifyContent: 'center',
                          maxWidth: isMobile ? '100%' : 520,
                        }}>
                          {SUGGESTIONS.map((s, i) => (
                            <motion.button
                              key={s.query}
                              initial={{ opacity: 0, scale: 0.88 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.32 + i * 0.06 }}
                              whileTap={{ scale: 0.93 }}
                              onClick={() => handleSend(s.query)}
                              style={{
                                padding: isMobile ? '8px 14px' : '9px 16px',
                                borderRadius: 99,
                                background: 'var(--bg-2)',
                                border: '1px solid var(--border-md)',
                                color: 'var(--text-2)', cursor: 'pointer',
                                fontSize: isMobile ? 11 : 12,
                                fontFamily: 'var(--font-body)', fontWeight: 500,
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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {messages.map((msg, i) => (
                      <MessageBubble key={i} message={msg} isMobile={isMobile} />
                    ))}
                    {loading && <TypingIndicator />}
                  </div>
                  <div ref={bottomRef} />
                </div>

                {/* Input bar */}
                <div style={{
                  padding: `10px ${isMobile ? '12px' : '28px'} ${isMobile ? '12px' : '14px'}`,
                  flexShrink: 0,
                  borderTop: '1px solid var(--border)',
                  background: 'rgba(8,11,18,0.94)',
                  backdropFilter: 'blur(20px)',
                }}>
                  <motion.div
                    animate={{
                      borderColor: focused ? 'rgba(124,106,247,0.65)' : 'rgba(255,255,255,0.09)',
                      boxShadow: focused ? '0 0 0 3px rgba(124,106,247,0.08)' : 'none',
                    }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: `${isMobile ? '10px' : '11px'} 14px`,
                      borderRadius: isMobile ? 14 : 16,
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
                      placeholder={isMobile ? 'Ask anything...' : 'e.g. Top 10 agents by recovery this month, or इस महीने DPD क्या है?'}
                      rows={1}
                      style={{
                        flex: 1, background: 'transparent',
                        border: 'none', outline: 'none', resize: 'none',
                        fontSize: isMobile ? 16 : 14, // 16px prevents iOS zoom
                        color: 'var(--text-1)',
                        lineHeight: '22px', fontFamily: 'var(--font-body)',
                        caretColor: '#7C6AF7',
                        maxHeight: '100px', overflowY: 'auto',
                        padding: 0, margin: 0, display: 'block',
                      }}
                    />

                    <motion.button
                      whileTap={input.trim() && !loading ? { scale: 0.88 } : {}}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      style={{
                        width: isMobile ? 38 : 36, height: isMobile ? 38 : 36,
                        borderRadius: 11, flexShrink: 0,
                        background: input.trim() && !loading
                          ? 'linear-gradient(135deg, #7C6AF7, #5A4FE0)'
                          : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        cursor: input.trim() && !loading ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: input.trim() && !loading ? 1 : 0.22,
                        transition: 'all 0.2s',
                        boxShadow: input.trim() && !loading ? '0 0 20px rgba(124,106,247,0.5)' : 'none',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                      </svg>
                    </motion.button>
                  </motion.div>

                  {/* Hints — hide on mobile */}
                  {!isMobile && (
                    <div style={{
                      display: 'flex', justifyContent: 'center', gap: 18,
                      marginTop: 7, fontSize: 11, color: 'var(--text-3)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      <span>↵ send</span>
                      <span>⇧↵ new line</span>
                      <span>⌘B sidebar</span>
                      <span>🇮🇳 hindi supported</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── ANALYTICS ─── */}
            {tab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
              >
                <AnalyticsPage isMobile={isMobile} />
              </motion.div>
            )}

            {/* ─── REPORTS ─── */}
            {tab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}
              >
                <ReportsPage entries={reports} onReplay={handleReplay} isMobile={isMobile} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{
        display: 'flex', alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: `0 ${isMobile ? '14px' : '24px'}`,
        height: isMobile ? 28 : 34, flexShrink: 0,
        background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
      }}>
        {!isMobile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'var(--font-body)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent-2)' }}>AGENTIC STARLORDS</span>
              <span style={{ color: 'var(--border-md)' }}>·</span>
              <span style={{ color: 'var(--text-3)' }}>Collections AI 36</span>
              <span style={{ color: 'var(--border-md)' }}>·</span>
              <span style={{ color: 'var(--text-3)' }}>by CreditNirvana</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
              © 2026 Team Agentic Starlords · All rights reserved
            </span>
          </>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>
            © 2026 Agentic Starlords · Collections AI 36
          </span>
        )}
      </footer>
    </div>
  )
}