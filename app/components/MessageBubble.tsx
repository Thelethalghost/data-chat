'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChartRenderer from './ChartRenderer'
import type { Message } from '../page'

interface Props {
  message: Message
  isMobile?: boolean
}

export default function MessageBubble({ message, isMobile = false }: Props) {
  const [sqlOpen, setSqlOpen] = useState(false)
  const [copied, setCopied]   = useState(false)

  const copySQL = () => {
    if (!message.sql) return
    navigator.clipboard.writeText(message.sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        style={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        <div style={{
          maxWidth: isMobile ? '88%' : '72%',
          padding: isMobile ? '9px 14px' : '10px 16px',
          borderRadius: '14px 4px 14px 14px',
          background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
          color: '#fff', fontSize: isMobile ? 14 : 14,
          lineHeight: 1.6, fontFamily: 'var(--font-body)',
          boxShadow: '0 2px 14px rgba(124,106,247,0.3)',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'flex-start' }}
    >
      {/* Avatar */}
      <div style={{
        width: isMobile ? 26 : 30, height: isMobile ? 26 : 30,
        borderRadius: 9, flexShrink: 0,
        background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Answer text */}
        <div style={{
          padding: isMobile ? '9px 13px' : '10px 16px',
          borderRadius: '4px 14px 14px 14px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          fontSize: 14, color: 'var(--text-1)',
          lineHeight: 1.65, fontFamily: 'var(--font-body)',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>

        {/* Chart title */}
        {message.title && (
          <div style={{
            marginTop: 10, fontSize: 12, fontWeight: 600,
            color: 'var(--text-2)', fontFamily: 'var(--font-body)',
          }}>
            {message.title}
          </div>
        )}

        {/* Chart */}
        {message.chartType && message.data && message.columns && (
          <ChartRenderer
            chartType={message.chartType}
            data={message.data}
            columns={message.columns}
            isMobile={isMobile}
          />
        )}

        {/* Insight */}
        {message.insight && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: 'rgba(29,179,123,0.1)',
              border: '1px solid rgba(29,179,123,0.2)',
              fontSize: 12, color: '#1DB37B',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span style={{ fontSize: 12 }}>💡</span>
            {message.insight}
          </motion.div>
        )}

        {/* SQL toggle */}
        {message.sql && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setSqlOpen((p) => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: 'var(--text-3)',
                fontFamily: 'var(--font-body)', padding: '4px 0',
              }}
            >
              <motion.span
                animate={{ rotate: sqlOpen ? 90 : 0 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'inline-block', fontSize: 9 }}
              >▶</motion.span>
              View SQL
            </button>

            <AnimatePresence>
              {sqlOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    marginTop: 6, position: 'relative',
                    borderRadius: 10, overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-1)',
                  }}>
                    <button
                      onClick={copySQL}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        padding: '3px 9px', borderRadius: 6, fontSize: 11,
                        background: copied ? 'rgba(29,179,123,0.15)' : 'var(--bg-3)',
                        border: `1px solid ${copied ? 'rgba(29,179,123,0.3)' : 'var(--border)'}`,
                        color: copied ? '#1DB37B' : 'var(--text-3)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      {copied ? '✓' : 'copy'}
                    </button>
                    <pre style={{
                      margin: 0, padding: '12px 14px',
                      fontSize: isMobile ? 11 : 12, color: '#8B92A5',
                      lineHeight: 1.6, overflowX: 'auto',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>
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