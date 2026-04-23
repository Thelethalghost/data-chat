'use client'

import { motion } from 'framer-motion'

interface HistoryItem {
  id: string
  preview: string
  timestamp: Date
}

interface Props {
  history: HistoryItem[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function HistorySidebar({ history, currentId, onSelect, onNew }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
    }}>

      {/* Header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: 'linear-gradient(135deg, #7C6AF7, #5A4FE0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,106,247,0.35)', flexShrink: 0,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 16,
              letterSpacing: '0.1em', color: 'var(--text-1)', lineHeight: 1,
            }}>
              ASKCN
            </div>
            <div style={{
              fontSize: 10, color: 'var(--text-3)',
              marginTop: 2, letterSpacing: '0.06em',
              fontFamily: 'var(--font-body)',
            }}>
              Conversations
            </div>
          </div>
        </div>
      </div>

      {/* New conversation button */}
      <div style={{ padding: '10px 12px 0' }}>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNew}
          style={{
            width: '100%', padding: '8px 12px',
            borderRadius: 10, fontSize: 12, fontWeight: 500,
            background: 'transparent',
            border: '1px solid var(--border-md)',
            color: 'var(--text-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.15s',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-2)'
            e.currentTarget.style.color = 'var(--text-1)'
            e.currentTarget.style.borderColor = 'rgba(124,106,247,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-2)'
            e.currentTarget.style.borderColor = 'var(--border-md)'
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 6,
            background: 'var(--bg-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1, flexShrink: 0,
          }}>+</span>
          New conversation
        </motion.button>
      </div>

      {/* Section label */}
      <div style={{
        padding: '14px 16px 5px',
        fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
        letterSpacing: '0.1em', fontFamily: 'var(--font-body)',
      }}>
        RECENT
      </div>

      {/* History list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {history.length === 0 && (
          <div style={{
            padding: '8px 16px', fontSize: 12,
            color: 'var(--text-3)', fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
          }}>
            No conversations yet
          </div>
        )}

        {history.map((item, i) => {
          const isActive = item.id === currentId
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onSelect(item.id)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 16px',
                background: isActive ? 'rgba(124,106,247,0.08)' : 'transparent',
                border: 'none',
                borderLeft: isActive
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{
                fontSize: 12,
                color: isActive ? 'var(--accent-2)' : 'var(--text-2)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: 3, fontFamily: 'var(--font-body)',
              }}>
                {item.preview}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-3)',
                fontFamily: 'var(--font-body)',
              }}>
                {timeAgo(item.timestamp)}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Status footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}
        />
        <span style={{
          fontSize: 11, color: 'var(--text-3)',
          fontFamily: 'var(--font-body)',
        }}>
          Oracle 19c · Connected
        </span>
      </div>

    </div>
  )
}