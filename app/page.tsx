'use client'

import { useState, useRef, useEffect, useCallback, JSX } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import MessageBubble from './components/MessageBubble'
import TypingIndicator from './components/TypingIndicator'
import FilterChips from './components/FilterChips'
import HistorySidebar from './components/HistorySidebar'
import AnalyticsPage from './components/AnalyticsPage'
import ReportsPage, { type ReportEntry } from './components/ReportsPage'

// ── Types ─────────────────────────────────────────────────────────
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
  id: string; preview: string; timestamp: Date; pinned?: boolean
}

type Tab = 'overview' | 'analytics' | 'reports'
type Theme = 'dark' | 'light'

// ── API Config ────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fits-hormone-intense-intense.trycloudflare.com'

// ── SVG Icons ─────────────────────────────────────────────────────
export const Icons = {
  chat:      (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  bar:       (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  list:      (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  send:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  menu:      (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  plus:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  sun:       (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:      (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  agents:    (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  dpd:       (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="8" width="7" height="13" rx="1"/></svg>,
  ptp:       (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
  trend:     (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/></svg>,
  channel:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 10a2 2 0 0 1 1.99-2.18h3"/></svg>,
  globe:     (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  search:    (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  pin:       (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
  unpin:     (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><line x1="12" y1="17" x2="12" y2="22"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"/></svg>,
  trash:     (s=11) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  chevLeft:  (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>,
  chevRight: (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6"/></svg>,
  oracle:    (s=7)  => <svg width={s} height={s} viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>,
}

// ── Constants ─────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'overview',  label: 'Overview',  icon: () => Icons.chat(14) },
  { id: 'analytics', label: 'Analytics', icon: () => Icons.bar(14) },
  { id: 'reports',   label: 'Reports',   icon: () => Icons.list(14) },
]

const SUGGESTIONS = [
  { label: 'Top agents by recovery',   icon: () => Icons.agents(), query: 'Top 10 agents by recovery rate this month' },
  { label: 'DPD bucket breakdown',     icon: () => Icons.dpd(),    query: 'How many accounts are in each DPD bucket?' },
  { label: 'PTP by product type',      icon: () => Icons.ptp(),    query: 'PTP conversion rate by product type' },
  { label: 'Roll rate — 3 months',     icon: () => Icons.trend(),  query: 'Roll rates over last 3 months' },
  { label: 'Recovery by channel',      icon: () => Icons.channel(),query: 'Recovery amount by contact channel' },
  { label: 'Hindi query',              icon: () => Icons.globe(),  query: 'इस महीने सबसे ज़्यादा recovery किसने की?' },
]

const FILTER_KEYWORDS = [
  'personal loan', 'business loan', 'credit card', 'auto loan',
  '30-60 dpd', '60-90 dpd', '90+ dpd', 'this month', 'last month',
]

// ── API Response Mapper ───────────────────────────────────────────
function mapResponse(d: Record<string, unknown>): Omit<Message, 'role'> {
  const chart     = (d.chart as Record<string, unknown>) || {}
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

// ── Hooks ─────────────────────────────────────────────────────────
function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: width < 640, isTablet: width >= 640 && width < 1024, width }
}

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    const saved = localStorage.getItem('askcn-theme') as Theme | null
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved) }
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('askcn-theme', next)
  }
  return [theme, toggle]
}

// ── Component ─────────────────────────────────────────────────────
export default function Home() {
  const { isMobile, isTablet } = useBreakpoint()
  const isSmall = isMobile || isTablet
  const [theme, toggleTheme] = useTheme()

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        if (isSmall) setSidebarOpen(p => !p)
        else setSidebarCollapsed(p => !p)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isSmall])

  useEffect(() => { if (isSmall) setSidebarOpen(false) }, [tab, isSmall])

  const resetTextarea = () => { if (inputRef.current) inputRef.current.style.height = 'auto' }

  const saveSession = (id: string | null, msgs: Message[]) => {
    if (!id || msgs.length === 0) return
    setSessions(p => ({ ...p, [id]: msgs }))
  }

  // ── Send query to real API ──────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const raw   = text ?? input
    const query = raw.startsWith('__quick__') ? raw.replace('__quick__', '') : raw.trim()
    if (!query || loading) return

    setInput(''); resetTextarea(); setTab('overview')
    if (isSmall) setSidebarOpen(false)
    setLoading(true)

    const userMsg: Message = { role: 'user', content: query }
    let activeId = currentHistoryId

    setMessages(prev => {
      const updated = [...prev, userMsg]
      if (activeId) saveSession(activeId, updated)
      return updated
    })

    if (messages.length === 0) {
      const id = `${Date.now()}`
      const preview = query.slice(0, 38) + (query.length > 38 ? '…' : '')
      setHistory(p => [{ id, preview, timestamp: new Date() }, ...p])
      setCurrentHistoryId(id)
      setSessions(p => ({ ...p, [id]: [userMsg] }))
      activeId = id
    }

    const t0 = Date.now()
    try {
      // ── Real API call ──
      // Payload: { query, language, session_id? }
      // First request: session_id is null
      // Subsequent: include session_id from previous response
      const isHindi = /[\u0900-\u097F]/.test(query)
      const payload: Record<string, unknown> = {
        query,
        language: isHindi ? 'hi' : 'en',
      }
      if (sessionId) payload.session_id = sessionId

      const { data: d } = await axios.post(
        `${API_URL}/query`,
        payload,
        { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
      )

      const duration = Date.now() - t0

      // Store session_id from response
      if (d.session_id) setSessionId(d.session_id)

      // Extract filter keywords
      const found = FILTER_KEYWORDS.filter(k => query.toLowerCase().includes(k))
      if (found.length) setFilters(p => [...new Set([...p, ...found])])

      // Map response to Message
      const aiMsg: Message = { role: 'assistant', ...mapResponse(d) }
      setMessages(prev => {
        const updated = [...prev, aiMsg]
        if (activeId) saveSession(activeId, updated)
        return updated
      })

      // Save to reports
      const chart = (d.chart as Record<string, unknown>) || {}
      setReports(p => [{
        id: `${Date.now()}`, query,
        sql: (d.sql as string) || null,
        chartType: (chart.chart_type as string) || 'none',
        rowCount: (d.rows_returned as number) || 0,
        timestamp: new Date(), durationMs: duration,
      }, ...p])

    } catch (err) {
      console.error('API error:', err)
      const errMsg: Message = {
        role: 'assistant',
        content: '⚠ Could not reach the backend. Check the API URL and try again.',
      }
      setMessages(prev => {
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
    setCurrentHistoryId(id); setMessages(sessions[id] || [])
    setFilters([]); setSessionId(null); setTab('overview')
    if (isSmall) setSidebarOpen(false)
  }

  const handleNew = async () => {
    saveSession(currentHistoryId, messages)
    setMessages([]); setSessionId(null); setFilters([]); setCurrentHistoryId(null)
    resetTextarea()
    if (isSmall) setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleDelete = (id: string) => {
    setHistory(p => p.filter(h => h.id !== id))
    setSessions(p => { const n = { ...p }; delete n[id]; return n })
    if (currentHistoryId === id) { setMessages([]); setCurrentHistoryId(null) }
  }

  const handlePin    = (id: string) => setHistory(p => p.map(h => h.id === id ? { ...h, pinned: !h.pinned } : h))
  const handleReplay = (query: string) => { setTab('overview'); setTimeout(() => handleSend(query), 100) }

  const sidebarWidth = sidebarCollapsed ? 48 : 220

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ══ HEADER ══ */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${isMobile ? '12px' : '20px'}`,
        height: 52, flexShrink: 0,
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--border)',
        zIndex: 50, gap: 8,
        boxShadow: 'var(--shadow-sm)',
      }}>

        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {isMobile && tab === 'overview' && (
            <button
              onClick={() => setSidebarOpen(p => !p)}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', borderRadius: 8, flexShrink: 0 }}
            >
              {Icons.menu()}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ position: 'relative', width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, flexShrink: 0 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '1.5px solid var(--accent-glow)',
                  borderTopColor: 'var(--accent)',
                }}
              />
              <div style={{
                position: 'absolute', inset: 4, borderRadius: 8,
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '0.1em' }}>ASKCN</div>
              {!isMobile && (
                <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-body)', marginTop: 1, letterSpacing: '0.1em', fontWeight: 500 }}>PORTFOLIO INTELLIGENCE</div>
              )}
            </div>
          </div>
        </div>

        {/* Center: tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 3, flexShrink: 0,
        }}>
          {TABS.map(t => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              whileTap={{ scale: 0.95 }}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6,
                padding: isMobile ? '6px 10px' : '6px 16px',
                borderRadius: 9, fontSize: 12, fontFamily: 'var(--font-body)',
                fontWeight: tab === t.id ? 600 : 400,
                border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-2)',
                minWidth: isMobile ? 36 : 90, justifyContent: 'center',
              }}
            >
              <span style={{ opacity: tab === t.id ? 1 : 0.65, display: 'flex' }}>{t.icon()}</span>
              {!isMobile && <span>{t.label}</span>}
              {t.id === 'reports' && reports.length > 0 && tab !== 'reports' && (
                <span style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)' }} />
              )}
            </motion.button>
          ))}
        </div>

        {/* Right: theme toggle + new chat (mobile) + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Theme toggle */}
          <motion.button
            whileTap={{ scale: 0.88, rotate: 180 }}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-2)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex' }}
              >
                {theme === 'dark' ? Icons.sun(15) : Icons.moon(15)}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {isMobile && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNew}
              title="New conversation"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent-glow)', border: '1px solid rgba(108,92,231,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-2)',
              }}
            >
              {Icons.plus(13)}
            </motion.button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ color: 'var(--green)', display: 'flex' }}
            >
              {Icons.oracle()}
            </motion.div>
            {!isMobile && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                Oracle 19c · Live
              </span>
            )} */}
          </div>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }}
          />
        )}

        {tab === 'overview' && (
          <motion.div
            initial={false}
            animate={isMobile ? { x: sidebarOpen ? 0 : -280 } : { width: sidebarCollapsed ? 48 : 220 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={isMobile ? {
              position: 'fixed', top: 0, left: 0, bottom: 0, width: 250, zIndex: 45,
            } : {
              flexShrink: 0, overflow: 'hidden', width: sidebarCollapsed ? 48 : 220,
            }}
          >
            <HistorySidebar
              history={history} currentId={currentHistoryId}
              onSelect={handleSelectHistory} onNew={handleNew}
              onDelete={handleDelete} onPin={handlePin}
              collapsed={!isMobile && sidebarCollapsed}
              onToggleCollapse={() => { if (isMobile) setSidebarOpen(false); else setSidebarCollapsed(p => !p) }}
              icons={Icons}
            />
          </motion.div>
        )}

        <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">

            {tab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                <FilterChips filters={filters} onRemove={f => setFilters(p => p.filter(x => x !== f))} />

                <div style={{
                  flex: 1, overflowY: 'auto',
                  padding: isMobile ? '16px 14px' : '24px 28px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <AnimatePresence mode="wait">
                    {messages.length === 0 && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          minHeight: isMobile ? '50vh' : '52vh',
                        }}
                      >
                        {/* Animated logo */}
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.7 }}
                          style={{ marginBottom: isMobile ? 22 : 28, position: 'relative', width: isMobile ? 64 : 76, height: isMobile ? 64 : 76 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid var(--accent-glow)', borderTopColor: 'var(--accent)' }}
                          />
                          <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid var(--accent-glow)', borderBottomColor: 'var(--accent-2)' }}
                          />
                          <div style={{
                            position: 'absolute', inset: isMobile ? 12 : 14, borderRadius: 14,
                            background: 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 28px var(--accent-glow)',
                          }}>
                            <motion.div
                              animate={{ scale: [1, 1.25, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity }}
                              style={{ width: isMobile ? 10 : 13, height: isMobile ? 10 : 13, borderRadius: '50%', background: 'rgba(255,255,255,0.95)' }}
                            />
                          </div>
                        </motion.div>

                        <motion.h1
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.18 }}
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: isMobile ? 34 : 50,
                            color: 'var(--text-1)', textAlign: 'center',
                            lineHeight: 1, marginBottom: 12, letterSpacing: '0.06em',
                          }}
                        >
                          ASK YOUR PORTFOLIO
                        </motion.h1>

                        <motion.p
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.26 }}
                          style={{
                            fontSize: isMobile ? 12 : 13, color: 'var(--text-2)',
                            fontFamily: 'var(--font-body)', textAlign: 'center',
                            maxWidth: 360, lineHeight: 1.8, marginBottom: 30,
                          }}
                        >
                          Natural language analytics · English & Hindi · Live Oracle data
                        </motion.p>

                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.34 }}
                          style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: isMobile ? '100%' : 570 }}
                        >
                          {SUGGESTIONS.map((s, i) => (
                            <motion.button
                              key={s.query}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.38 + i * 0.05 }}
                              whileHover={{ scale: 1.04, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSend(s.query)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: isMobile ? '8px 13px' : '8px 15px',
                                borderRadius: 99, background: 'var(--bg-2)',
                                border: '1px solid var(--border-md)',
                                color: 'var(--text-2)', cursor: 'pointer',
                                fontSize: isMobile ? 12 : 12.5,
                                fontFamily: 'var(--font-body)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--accent)'
                                e.currentTarget.style.color = 'var(--text-1)'
                                e.currentTarget.style.background = 'var(--accent-glow)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-md)'
                                e.currentTarget.style.color = 'var(--text-2)'
                                e.currentTarget.style.background = 'var(--bg-2)'
                              }}
                            >
                              <span style={{ display: 'flex', color: 'var(--accent-2)', flexShrink: 0 }}>{s.icon()}</span>
                              {s.label}
                            </motion.button>
                          ))}
                        </motion.div>
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
                  padding: isMobile ? '10px 12px 12px' : '10px 24px 14px',
                  flexShrink: 0, borderTop: '1px solid var(--border)',
                  background: 'var(--bg-1)',
                }}>
                  <motion.div
                    animate={{
                      borderColor: focused ? 'var(--accent)' : 'var(--border-md)',
                      boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none',
                    }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 16,
                      background: 'var(--bg-2)', border: '1px solid var(--border-md)',
                    }}
                  >
                    {/* Left icon */}
                    <div style={{
                      width: 20, height: 20, flexShrink: 0,
                      opacity: focused ? 1 : 0.35, transition: 'opacity 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)',
                    }}>
                      <svg viewBox="0 0 22 22" fill="none" width="20" height="20">
                        <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="11" cy="11" r="3.5" fill="currentColor" />
                      </svg>
                    </div>

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKey}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder={isMobile ? 'Ask anything…' : 'Ask anything about your portfolio, or type in Hindi…'}
                      rows={1}
                      style={{
                        flex: 1, background: 'transparent',
                        border: 'none', outline: 'none', resize: 'none',
                        fontSize: isMobile ? 16 : 14,
                        color: 'var(--text-1)', lineHeight: '22px',
                        fontFamily: 'var(--font-body)',
                        caretColor: 'var(--accent)',
                        maxHeight: '100px', overflowY: 'auto',
                        padding: 0, margin: 0, display: 'block',
                      }}
                    />

                    <motion.button
                      whileTap={input.trim() && !loading ? { scale: 0.88 } : {}}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      style={{
                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                        background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-3)',
                        border: 'none',
                        cursor: input.trim() && !loading ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: input.trim() && !loading ? '#fff' : 'var(--text-3)',
                        opacity: input.trim() && !loading ? 1 : 0.4,
                      }}
                    >
                      {Icons.send()}
                    </motion.button>
                  </motion.div>

                  {!isMobile && (
                    <div style={{
                      display: 'flex', justifyContent: 'center', gap: 20,
                      marginTop: 7, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)',
                    }}>
                      <span>↵ send</span>
                      <span>⇧↵ new line</span>
                      <span>⌘B sidebar</span>
                      <span>Hindi supported</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <AnalyticsPage isMobile={isMobile} />
              </motion.div>
            )}

            {tab === 'reports' && (
              <motion.div key="reports" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                <ReportsPage entries={reports} onReplay={handleReplay} isMobile={isMobile} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      {/* <footer style={{
        display: 'flex', alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: `0 ${isMobile ? '14px' : '20px'}`,
        height: isMobile ? 26 : 30, flexShrink: 0,
        background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          {isMobile ? 'Agentic Starlords · Collections AI 36' : 'Team Agentic Starlords · Collections AI 36 · by CreditNirvana'}
        </span>
        {!isMobile && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            © 2026 Team Agentic Starlords
          </span>
        )}
      </footer> */}
                  <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: `0 ${isMobile ? '14px' : '20px'}`,
        height: isMobile ? 26 : 30,
        flexShrink: 0,
        background: 'var(--bg-1)',
        borderTop: '1px solid var(--border)',
      }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
          }}
        >
          {isMobile ? (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--accent-2)',
                  letterSpacing: '0.06em',
                }}
              >
                Agentic Starlords
              </span>
              {' · Collections AI 36'}
            </>
          ) : (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--accent-2)',
                  letterSpacing: '0.06em',
                  fontSize: 16
                }}
              >
                Agentic Starlords
              </span>
              {' · by CreditNirvana'}
            </>
          )}
        </span>

        {!isMobile && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
            }}
          >
            © 2026 Team Agentic Starlords
          </span>
        )}
      </footer>
    </div>
  )
}