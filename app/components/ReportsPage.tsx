'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export interface ReportEntry {
  id: string
  query: string
  sql: string | null
  chartType: string
  rowCount: number
  timestamp: Date
  durationMs: number
}

interface Props {
  entries: ReportEntry[]
  onReplay: (query: string) => void
}

function timeStr(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function chartBadge(type: string) {
  const map: Record<string, { label: string, color: string, bg: string }> = {
    bar:          { label: 'Bar',    color: '#7C6AF7', bg: 'rgba(124,106,247,0.12)' },
    line:         { label: 'Line',   color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
    pie:          { label: 'Pie',    color: '#E8A045', bg: 'rgba(232,160,69,0.12)' },
    table:        { label: 'Table',  color: '#1DB37B', bg: 'rgba(29,179,123,0.12)' },
    single_value: { label: 'Value',  color: '#9F97F9', bg: 'rgba(159,151,249,0.12)' },
    none:         { label: 'Text',   color: '#8B92A5', bg: 'rgba(139,146,165,0.12)' },
  }
  const c = map[type] || map.none
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
      color: c.color, background: c.bg,
    }}>{c.label}</span>
  )
}

export default function ReportsPage({ entries, onReplay }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copySQL = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const totalQueries = entries.length
  const avgDuration = entries.length
    ? Math.round(entries.reduce((a, e) => a + e.durationMs, 0) / entries.length)
    : 0
  const totalRows = entries.reduce((a, e) => a + e.rowCount, 0)
  const hindiQueries = entries.filter(e =>
    /[\u0900-\u097F]/.test(e.query)
  ).length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 28,
          letterSpacing: '0.08em', color: 'var(--text-1)', marginBottom: 4,
        }}>SESSION REPORTS</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          All queries from this session · click any row to expand SQL
        </p>
      </motion.div>

      {/* Session stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Queries Run', value: totalQueries, color: '#7C6AF7' },
          { label: 'Avg Response', value: avgDuration ? `${avgDuration}ms` : '—', color: '#1DB37B' },
          { label: 'Total Rows Fetched', value: totalRows.toLocaleString('en-IN'), color: '#E8A045' },
          { label: 'Hindi Queries', value: hindiQueries, color: '#38BDF8' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.07em', marginBottom: 8 }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28,
              letterSpacing: '0.04em', color: s.color, lineHeight: 1,
            }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 0', gap: 12,
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
            No queries yet this session
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            Switch to Overview and ask your first question
          </div>
        </motion.div>
      )}

      {/* Query table */}
      {entries.length > 0 && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 80px 80px 80px 100px 44px',
            gap: 0, padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-3)',
          }}>
            {['Query', 'Type', 'Rows', 'Time', 'Asked at', ''].map((h) => (
              <div key={h} style={{
                fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                letterSpacing: '0.08em', fontFamily: 'var(--font-body)',
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <AnimatePresence>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Main row */}
                <div
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 80px 80px 80px 100px 44px',
                    gap: 0, padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: expanded === entry.id ? 'rgba(124,106,247,0.05)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (expanded !== entry.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={(e) => { if (expanded !== entry.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                    {entry.query}
                  </div>
                  <div>{chartBadge(entry.chartType)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}>
                    {entry.rowCount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 13, color: entry.durationMs < 3000 ? '#1DB37B' : '#E8A045', fontFamily: 'var(--font-body)' }}>
                    {entry.durationMs}ms
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
                    {timeStr(entry.timestamp)}
                  </div>
                  <motion.div
                    animate={{ rotate: expanded === entry.id ? 90 : 0 }}
                    style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >▶</motion.div>
                </div>

                {/* Expanded SQL panel */}
                <AnimatePresence>
                  {expanded === entry.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden', borderBottom: '1px solid var(--border)' }}
                    >
                      <div style={{ padding: '14px 20px', background: 'rgba(8,11,18,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}>
                            GENERATED SQL
                          </span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (entry.sql) copySQL(entry.id, entry.sql) }}
                              style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                                background: copied === entry.id ? 'rgba(29,179,123,0.15)' : 'var(--bg-3)',
                                border: `1px solid ${copied === entry.id ? 'rgba(29,179,123,0.3)' : 'var(--border)'}`,
                                color: copied === entry.id ? '#1DB37B' : 'var(--text-3)',
                                cursor: 'pointer', fontFamily: 'var(--font-body)',
                              }}
                            >
                              {copied === entry.id ? '✓ copied' : 'copy'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onReplay(entry.query) }}
                              style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: 11,
                                background: 'rgba(124,106,247,0.12)',
                                border: '1px solid rgba(124,106,247,0.25)',
                                color: 'var(--accent-2)', cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              ↺ replay
                            </button>
                          </div>
                        </div>
                        {entry.sql ? (
                          <pre style={{
                            fontSize: 12, color: '#8B92A5', lineHeight: 1.7,
                            fontFamily: 'monospace', overflowX: 'auto',
                            padding: '10px 14px', borderRadius: 8,
                            background: 'var(--bg-1)', border: '1px solid var(--border)',
                          }}>
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
          </AnimatePresence>
        </div>
      )}

      {/* Export hint */}
      {entries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 16, padding: '10px 16px', borderRadius: 10,
            background: 'rgba(124,106,247,0.06)', border: '1px solid rgba(124,106,247,0.15)',
            fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ color: 'var(--accent)' }}>💡</span>
          Click any row to view the generated Oracle SQL · Use the replay button to re-run a query in Overview
        </motion.div>
      )}

    </div>
  )
}