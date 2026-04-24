'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'
import axios from 'axios'
import ChartRenderer from './ChartRenderer'

export interface ReportEntry {
  id: string; query: string; sql: string | null
  chartType: string; rowCount: number; timestamp: Date; durationMs: number
  modelId?: string; modelName?: string
}

// ── Execute response shape ────────────────────────────────────────
interface ExecuteResult {
  answer: string
  sql: string
  rows_returned: number
  chart: {
    chart_type: string
    title: string
    x_key: string | null
    y_keys: string[]
    data: Record<string, unknown>[]
  }
}

interface Props {
  entries: ReportEntry[]
  onReplay: (query: string) => void
  isMobile?: boolean
  apiUrl: string
}

function timeStr(d: Date) { return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }

const CHART_TYPE_LABELS: Record<string, string> = { bar: 'Bar', line: 'Line', pie: 'Pie', table: 'Table', single_value: 'Value', grouped_bar: 'Grouped', histogram: 'Histogram', none: 'Text' }
const CHART_TYPE_COLORS: Record<string, string> = { bar: 'var(--accent-2)', line: '#74B9FF', pie: 'var(--amber)', table: 'var(--green)', single_value: 'var(--accent-3)', grouped_bar: '#FD79A8', histogram: '#55EFC4', none: 'var(--text-3)' }

function TypeBadge({ type }: { type: string }) {
  const label = CHART_TYPE_LABELS[type] || type
  const color = CHART_TYPE_COLORS[type] || 'var(--text-3)'
  return <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, color, background: `${color}18`, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>{label}</span>
}

function ModelBadge({ name }: { name?: string }) {
  if (!name) return null
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, color: 'var(--accent-2)', background: 'var(--accent-glow)', border: '1px solid rgba(108,92,231,0.2)', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>
      {name}
    </span>
  )
}

// ── Inline result panel ───────────────────────────────────────────
function ExecuteResultPanel({ result, isMobile }: { result: ExecuteResult; isMobile: boolean }) {
  const chart = result.chart
  const chartData = chart?.data || []
  const chartType = chart?.chart_type

  // Resolve columns for ChartRenderer
  let columns: string[] = []
  if (chart?.x_key && chartData.length > 0) {
    const allKeys = Object.keys(chartData[0])
    const numericKeys = allKeys.filter(k =>
      k !== chart.x_key && (
        typeof chartData[0][k] === 'number' ||
        (typeof chartData[0][k] === 'string' && !isNaN(Number(chartData[0][k])) && (chartData[0][k] as string) !== '')
      )
    )
    const validY = (chart.y_keys || []).filter(k => numericKeys.includes(k))
    columns = validY.length > 0 ? [chart.x_key!, ...validY] : numericKeys.length > 0 ? [chart.x_key!, numericKeys[0]] : [chart.x_key!, ...allKeys.filter(k => k !== chart.x_key).slice(0, 1)]
  } else if (chartData.length > 0) {
    columns = Object.keys(chartData[0])
  }

  const showChart = chartType && chartType !== 'none' && chartData.length > 0 && columns.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      style={{ marginTop: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,184,148,0.25)', background: 'rgba(0,184,148,0.04)' }}>
      {/* Result header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,184,148,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.05em' }}>EXECUTE RESULT</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{result.rows_returned} row{result.rows_returned !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Answer text */}
        {result.answer && (
          <div style={{ fontSize: 13, color: 'var(--text-1)', fontFamily: 'var(--font-body)', lineHeight: 1.6, marginBottom: showChart ? 12 : 0 }}>
            {result.answer}
          </div>
        )}

        {/* Chart or table */}
        {showChart && (
          <ChartRenderer chartType={chartType} data={chartData} columns={columns} isMobile={isMobile} />
        )}

        {/* Fallback: raw data table if no chart */}
        {!showChart && chartData.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: result.answer ? 10 : 0, borderRadius: 8, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)' }}>
                  {Object.keys(chartData[0]).map(col => (
                    <th key={col} style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-3)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                      {col.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 20).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-2)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                    {Object.keys(chartData[0]).map(col => (
                      <td key={col} style={{ padding: '6px 10px', color: 'var(--text-2)', fontFamily: 'var(--font-body)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {chartData.length > 20 && (
              <div style={{ padding: '5px 10px', fontSize: 10, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                Showing 20 of {chartData.length} rows
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── SQL Edit Modal ────────────────────────────────────────────────
function SQLEditModal({
  entry, apiUrl, isMobile, onClose,
}: {
  entry: ReportEntry
  apiUrl: string
  isMobile: boolean
  onClose: () => void
}) {
  const [sql, setSql]           = useState(entry.sql || '')
  const [running, setRunning]   = useState(false)
  const [result, setResult]     = useState<ExecuteResult | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    if (!sql.trim() || running) return
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const { data } = await axios.post(
        `${apiUrl}/execute`,
        { sql: sql.trim() },
        { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
      )
      setResult(data as ExecuteResult)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Execution failed'
      setError(msg)
    } finally {
      setRunning(false)
    }
  }, [sql, apiUrl, running])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to run
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
    // Tab = 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart
      const end   = el.selectionEnd
      const newVal = sql.substring(0, start) + '  ' + sql.substring(end)
      setSql(newVal)
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + 2 }, 0)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 24 }}>
      <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: 18, width: '100%', maxWidth: 720, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '92vh' : '88vh', overflow: 'hidden' }}>

        {/* Modal header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>
                </svg>
                SQL Editor
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                Edit and execute SQL directly against the database · <kbd style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>⌘↵</kbd> to run
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 17, flexShrink: 0 }}>×</button>
          </div>

          {/* Original query context */}
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 3 }}>ORIGINAL QUERY</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-body)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never, overflow: 'hidden' }}>
              {entry.query}
            </div>
          </div>
        </div>

        {/* SQL Editor area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Editor */}
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-md)', background: 'var(--bg-1)' }}>
            {/* Line numbers gutter */}
            <div style={{ display: 'flex' }}>
              <div style={{ padding: '12px 8px', borderRight: '1px solid var(--border)', background: 'var(--bg-2)', userSelect: 'none', flexShrink: 0, minWidth: 36 }}>
                {sql.split('\n').map((_, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', lineHeight: '20px', textAlign: 'right' }}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                spellCheck={false}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  fontSize: 13, color: 'var(--text-1)', lineHeight: '20px',
                  fontFamily: 'var(--font-mono)', padding: '12px 14px',
                  minHeight: 180, caretColor: 'var(--accent)',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid rgba(225,112,85,0.3)', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
              ⚠ {error}
            </motion.div>
          )}

          {/* Result */}
          {result && <ExecuteResultPanel result={result} isMobile={isMobile} />}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {result ? (
              <span style={{ color: 'var(--green)' }}>✓ {result.rows_returned} row{result.rows_returned !== 1 ? 's' : ''} returned</span>
            ) : running ? (
              <span style={{ color: 'var(--accent-2)' }}>Executing…</span>
            ) : (
              <span>Ready to execute</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Close
            </button>
            <motion.button
              whileTap={!running && sql.trim() ? { scale: 0.95 } : {}}
              onClick={handleRun}
              disabled={running || !sql.trim()}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: running ? 'var(--bg-4)' : sql.trim() ? 'var(--accent)' : 'var(--bg-4)',
                border: 'none', color: running || !sql.trim() ? 'var(--text-3)' : '#fff',
                cursor: running || !sql.trim() ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 7,
                opacity: running || !sql.trim() ? 0.6 : 1, transition: 'all 0.15s',
              }}>
              {running ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Running…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                  Run SQL
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main ReportsPage ──────────────────────────────────────────────
export default function ReportsPage({ entries, onReplay, isMobile = false, apiUrl }: Props) {
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [copied, setCopied]       = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<ReportEntry | null>(null)

  const copySQL = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql); setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const avgDuration = entries.length ? Math.round(entries.reduce((a, e) => a + e.durationMs, 0) / entries.length) : 0
  const hindiCount  = entries.filter(e => /[\u0900-\u097F]/.test(e.query)).length
  const pad         = isMobile ? '14px' : '22px 26px'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: pad }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 28, color: 'var(--text-1)', marginBottom: 3, letterSpacing: '-0.01em' }}>Session Reports</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>All queries this session · tap any row to view SQL</p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Queries Run',   value: entries.length,                                                color: 'var(--accent-2)' },
          { label: 'Avg Response',  value: avgDuration ? `${avgDuration}ms` : '—',                      color: 'var(--green)' },
          { label: 'Rows Fetched',  value: entries.reduce((a,e)=>a+e.rowCount,0).toLocaleString('en-IN'), color: 'var(--amber)' },
          { label: 'Hindi Queries', value: hindiCount,                                                    color: '#74B9FF' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 7, fontFamily: 'var(--font-body)', fontWeight: 500 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Empty */}
      {entries.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <div style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>No queries yet this session</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Switch to Chat and ask a question</div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ background: 'var(--bg-2)', border: `1px solid ${expanded === entry.id ? 'rgba(108,92,231,0.3)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden' }}>

              {/* Row header */}
              <div onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                style={{ padding: isMobile ? '11px 13px' : '11px 15px', cursor: 'pointer', background: expanded === entry.id ? 'var(--accent-glow)' : 'transparent', transition: 'background 0.12s' }}>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontWeight: 400, marginBottom: 7, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never, overflow: 'hidden' }}>
                  {entry.query}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TypeBadge type={entry.chartType} />
                  <ModelBadge name={entry.modelName} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{entry.rowCount} rows</span>
                  <span style={{ fontSize: 11, color: entry.durationMs < 3000 ? 'var(--green)' : 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{entry.durationMs}ms</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', marginLeft: 'auto' }}>{timeStr(entry.timestamp)}</span>
                  <motion.span animate={{ rotate: expanded === entry.id ? 90 : 0 }} transition={{ duration: 0.12 }}
                    style={{ fontSize: 9, color: 'var(--text-3)', display: 'inline-block' }}>▶</motion.span>
                </div>
              </div>

              {/* Expanded SQL panel */}
              <AnimatePresence>
                {expanded === entry.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: isMobile ? '10px 13px 14px' : '10px 15px 15px', borderTop: '1px solid var(--border)', background: 'rgba(6,8,15,0.4)' }}>

                      {/* Action bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.07em', fontFamily: 'var(--font-body)', fontWeight: 600 }}>GENERATED SQL</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Copy SQL */}
                          <button onClick={e => { e.stopPropagation(); if (entry.sql) copySQL(entry.id, entry.sql) }}
                            style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, background: copied===entry.id ? 'rgba(0,184,148,0.12)':'var(--bg-3)', border:`1px solid ${copied===entry.id ? 'rgba(0,184,148,0.3)':'var(--border)'}`, color: copied===entry.id ? 'var(--green)':'var(--text-3)', cursor:'pointer', fontFamily:'var(--font-mono)' }}>
                            {copied===entry.id ? '✓ done' : 'copy'}
                          </button>

                          {/* Edit SQL — opens the SQL editor modal */}
                          {entry.sql && (
                            <button onClick={e => { e.stopPropagation(); setEditingEntry(entry) }}
                              style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.3)', color: 'var(--accent-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>
                              </svg>
                              Edit & Run
                            </button>
                          )}

                          {/* Replay original query */}
                          <button onClick={e => { e.stopPropagation(); onReplay(entry.query) }}
                            style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, background: 'rgba(253,203,110,0.1)', border: '1px solid rgba(253,203,110,0.3)', color: 'var(--amber)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                            ↺ replay
                          </button>
                        </div>
                      </div>

                      {/* SQL display */}
                      {entry.sql ? (
                        <pre style={{ margin: 0, fontSize: isMobile ? 11 : 12, color: 'var(--text-2)', lineHeight: 1.65, overflowX: 'auto', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-1)', border: '1px solid var(--border)' }}>
                          {entry.sql}
                        </pre>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
                          No SQL generated — conversational response
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* SQL Edit Modal */}
      <AnimatePresence>
        {editingEntry && (
          <SQLEditModal
            entry={editingEntry}
            apiUrl={apiUrl}
            isMobile={isMobile}
            onClose={() => setEditingEntry(null)}
          />
        )}
      </AnimatePresence>

      <div style={{ height: 20 }} />
    </div>
  )
}