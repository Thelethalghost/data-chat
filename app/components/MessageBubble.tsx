'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChartRenderer from './ChartRenderer'
import type { Message } from '../page'

const ChevronIcon = ({ open }: { open: boolean }) => (
  <motion.svg animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}
    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ display: 'inline-block' }}>
    <polyline points="9,18 15,12 9,6"/>
  </motion.svg>
)

// ── Markdown renderer (bold, inline code, headings) ───────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        if (line.startsWith('## ')) return <div key={li} style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)', marginBottom: 4, marginTop: li > 0 ? 10 : 0, fontFamily: 'var(--font-body)' }}>{renderInline(line.replace(/^## /, ''))}</div>
        if (line.startsWith('# '))  return <div key={li} style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)', marginBottom: 6, marginTop: li > 0 ? 12 : 0, fontFamily: 'var(--font-body)' }}>{renderInline(line.replace(/^# /, ''))}</div>
        if (line.trim() === '')     return <div key={li} style={{ height: 5 }} />
        return <div key={li} style={{ marginBottom: 1, lineHeight: 1.7 }}>{renderInline(line)}</div>
      })}
    </>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ color: 'var(--text-1)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))   return <code key={i} style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-3)' }}>{part.slice(1, -1)}</code>
    return <span key={i}>{part}</span>
  })
}

// ── CSV download ──────────────────────────────────────────────────
function downloadCSV(csv: string, filename = 'export.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function MessageBubble({ message, isMobile = false }: { message: Message; isMobile?: boolean }) {
  const [sqlOpen, setSqlOpen] = useState(false)
  const [copied, setCopied]   = useState(false)

  const copySQL = () => {
    if (!message.sql) return
    navigator.clipboard.writeText(message.sql)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const csvFilename = (() => {
    const slug = message.content.slice(0, 40).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    return `${slug || 'export'}.csv`
  })()

  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
        style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: isMobile ? '88%' : '70%', padding: '10px 16px', borderRadius: '16px 4px 16px 16px', background: 'var(--accent)', color: '#fff', fontSize: 14, lineHeight: 1.6, fontFamily: 'var(--font-body)', fontWeight: 400, wordBreak: 'break-word' }}>
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>

      {/* Avatar */}
      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--bg-3)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-2)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Text bubble */}
        <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: 'var(--font-body)', fontWeight: 400, wordBreak: 'break-word' }}>
          <MarkdownText text={message.content} />
        </div>

        {/* Chart title */}
        {message.title && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: 'var(--text-2)', fontFamily: 'var(--font-body)', letterSpacing: '0.02em' }}>
            {message.title}
          </div>
        )}

        {/* Chart */}
        {message.chartType && message.data && message.columns && (
          <ChartRenderer chartType={message.chartType} data={message.data} columns={message.columns} isMobile={isMobile} />
        )}

        {/* ── CSV Download button ── */}
        {message.hasExport && message.csvData && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: 10 }}>
            <button
              onClick={() => downloadCSV(message.csvData!, csvFilename)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.3)', color: 'var(--green)', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,184,148,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,184,148,0.1)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download CSV
            </button>
          </motion.div>
        )}

        {/* Insight */}
        {message.insight && (
          <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 99, background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)', fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-body)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/></svg>
            {message.insight}
          </motion.div>
        )}

        {/* SQL */}
        {message.sql && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setSqlOpen(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 400, padding: '3px 0' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}>
              <ChevronIcon open={sqlOpen} />
              View SQL
            </button>
            <AnimatePresence>
              {sqlOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                  <div style={{ marginTop: 6, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-1)' }}>
                    <button onClick={copySQL}
                      style={{ position: 'absolute', top: 8, right: 8, padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: copied ? 'rgba(0,184,148,0.12)' : 'var(--bg-3)', border: `1px solid ${copied ? 'rgba(0,184,148,0.3)' : 'var(--border)'}`, color: copied ? 'var(--green)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>
                      {copied ? '✓ copied' : 'copy'}
                    </button>
                    <pre style={{ margin: 0, padding: '12px 14px', fontSize: isMobile ? 11 : 12, color: 'var(--text-2)', lineHeight: 1.7, fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {message.sql}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}