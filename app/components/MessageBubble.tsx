'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import ChartRenderer from './ChartRenderer'

interface Message {
  role: 'user' | 'assistant'
  content: string
  chartType?: string
  data?: Record<string, unknown>[]
  columns?: string[]
  insight?: string
  sql?: string
}

export default function MessageBubble({ message }: { message: Message }) {
  const [sqlOpen, setSqlOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copySQL = () => {
    if (!message.sql) return
    navigator.clipboard.writeText(message.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        <div style={{
          padding: '10px 16px',
          borderRadius: '14px 14px 4px 14px',
          background: 'linear-gradient(135deg, #7C6AF7, #6055D8)',
          color: '#fff', fontSize: 14, maxWidth: '72%',
          lineHeight: 1.55, fontWeight: 400,
          boxShadow: '0 4px 24px rgba(124,106,247,0.25)',
        }}>
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
    >
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        background: 'var(--bg-2)', border: '1px solid var(--border-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Main text */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '4px 14px 14px 14px',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)',
          fontSize: 14, lineHeight: 1.65,
        }}>
          {message.content}
        </div>

        {/* Insight pill */}
        {message.insight && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              marginTop: 8, padding: '8px 12px',
              borderRadius: 10, fontSize: 12,
              background: 'rgba(124,106,247,0.08)',
              border: '1px solid rgba(124,106,247,0.18)',
              color: '#9F97F9',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}
          >
            <span style={{ fontSize: 14, marginTop: -1 }}>↗</span>
            <span>{message.insight}</span>
          </motion.div>
        )}

        {/* Chart */}
        {message.chartType && message.chartType !== 'none' && message.data && (
          <ChartRenderer
            chartType={message.chartType}
            data={message.data}
            columns={message.columns || []}
          />
        )}

        {/* SQL toggle */}
        {message.sql && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setSqlOpen(!sqlOpen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--text-3)', display: 'flex',
                alignItems: 'center', gap: 5, padding: 0,
              }}
            >
              <motion.span
                animate={{ rotate: sqlOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'inline-block', fontSize: 10 }}
              >▶</motion.span>
              {sqlOpen ? 'hide' : 'view'} SQL
            </button>

            <AnimateHeight open={sqlOpen}>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <pre style={{
                  padding: '12px 14px', borderRadius: 10, fontSize: 12,
                  background: 'var(--bg-1)', border: '1px solid var(--border)',
                  color: '#8B92A5', overflowX: 'auto', lineHeight: 1.6,
                  fontFamily: 'monospace',
                }}>
                  {message.sql}
                </pre>
                <button
                  onClick={copySQL}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    padding: '3px 10px', borderRadius: 6, fontSize: 11,
                    background: copied ? 'rgba(29,179,123,0.15)' : 'var(--bg-3)',
                    border: `1px solid ${copied ? 'rgba(29,179,123,0.3)' : 'var(--border)'}`,
                    color: copied ? 'var(--green)' : 'var(--text-3)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ copied' : 'copy'}
                </button>
              </div>
            </AnimateHeight>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Simple animate height helper
function AnimateHeight({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  )
}