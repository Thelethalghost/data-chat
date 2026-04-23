'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export interface ReportEntry {
  id: string; query: string; sql: string | null
  chartType: string; rowCount: number; timestamp: Date; durationMs: number
}

interface Props { entries: ReportEntry[]; onReplay: (query: string) => void; isMobile?: boolean }

function timeStr(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar', line: 'Line', pie: 'Pie', table: 'Table',
  single_value: 'Value', grouped_bar: 'Grouped', histogram: 'Histogram', none: 'Text',
}
const CHART_TYPE_COLORS: Record<string, string> = {
  bar: 'var(--accent-2)', line: '#74B9FF', pie: 'var(--amber)',
  table: 'var(--green)', single_value: 'var(--accent-3)',
  grouped_bar: '#FD79A8', histogram: '#55EFC4', none: 'var(--text-3)',
}

function TypeBadge({ type }: { type: string }) {
  const label = CHART_TYPE_LABELS[type] || type
  const color = CHART_TYPE_COLORS[type] || 'var(--text-3)'
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, color, background: `${color}18`, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
      {label}
    </span>
  )
}

export default function ReportsPage({ entries, onReplay, isMobile = false }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)

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
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 28, color: 'var(--text-1)', marginBottom: 3, letterSpacing: '-0.01em' }}>
          Session Reports
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
          All queries this session · tap any row to view SQL
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Queries Run',   value: entries.length,                                     color: 'var(--accent-2)' },
          { label: 'Avg Response',  value: avgDuration ? `${avgDuration}ms` : '—',            color: 'var(--green)' },
          { label: 'Rows Fetched',  value: entries.reduce((a,e)=>a+e.rowCount,0).toLocaleString('en-IN'), color: 'var(--amber)' },
          { label: 'Hindi Queries', value: hindiCount,                                          color: '#74B9FF' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '13px 15px' }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 7, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 26, color: s.color, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty */}
      {entries.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <div style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>No queries yet this session</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 300 }}>Switch to Overview and ask a question</div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                background: 'var(--bg-2)',
                border: `1px solid ${expanded === entry.id ? 'rgba(108,92,231,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)', overflow: 'hidden',
              }}
            >
              {/* Row */}
              <div
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                style={{ padding: isMobile ? '11px 13px' : '11px 15px', cursor: 'pointer', background: expanded === entry.id ? 'var(--accent-glow)' : 'transparent', transition: 'background 0.12s' }}
              >
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontWeight: 400, marginBottom: 7, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as never, overflow: 'hidden' }}>
                  {entry.query}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <TypeBadge type={entry.chartType} />
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{entry.rowCount} rows</span>
                  <span style={{ fontSize: 11, color: entry.durationMs < 3000 ? 'var(--green)' : 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{entry.durationMs}ms</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', marginLeft: 'auto' }}>{timeStr(entry.timestamp)}</span>
                  <motion.span
                    animate={{ rotate: expanded === entry.id ? 90 : 0 }}
                    transition={{ duration: 0.12 }}
                    style={{ fontSize: 9, color: 'var(--text-3)', display: 'inline-block' }}
                  >▶</motion.span>
                </div>
              </div>

              {/* SQL expand */}
              <AnimatePresence>
                {expanded === entry.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: isMobile ? '10px 13px 13px' : '10px 15px 14px', borderTop: '1px solid var(--border)', background: 'rgba(6,8,15,0.4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.07em', fontFamily: 'var(--font-body)', fontWeight: 600 }}>GENERATED SQL</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); if (entry.sql) copySQL(entry.id, entry.sql) }}
                            style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, background: copied===entry.id ? 'rgba(0,184,148,0.12)':'var(--bg-3)', border:`1px solid ${copied===entry.id ? 'rgba(0,184,148,0.3)':'var(--border)'}`, color: copied===entry.id ? 'var(--green)':'var(--text-3)', cursor:'pointer', fontFamily:'var(--font-mono)' }}
                          >{copied===entry.id ? '✓ done' : 'copy'}</button>
                          <button
                            onClick={e => { e.stopPropagation(); onReplay(entry.query) }}
                            style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, background: 'var(--accent-glow)', border: '1px solid rgba(108,92,231,0.3)', color: 'var(--accent-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                          >↺ replay</button>
                        </div>
                      </div>
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

      <div style={{ height: 20 }} />
    </div>
  )
}