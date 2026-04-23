'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HistoryItem {
  id: string
  preview: string
  timestamp: Date
  pinned?: boolean
}

interface Props {
  history: HistoryItem[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const QUICK_QUERIES = [
  { icon: '📊', label: 'DPD breakdown',   query: 'Show DPD bucket distribution' },
  { icon: '🏆', label: 'Top agents',      query: 'Top 10 agents by recovery rate this month' },
  { icon: '📈', label: 'Roll rates',      query: 'Roll rates over last 3 months' },
  { icon: '🇮🇳', label: 'Hindi query',   query: 'इस महीने सबसे ज़्यादा recovery किसने की?' },
]

// ─── Collapsed icon strip ──────────────────────────────────────────
function CollapsedView({ history, currentId, onSelect, onNew, onToggleCollapse }: {
  history: HistoryItem[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onToggleCollapse: () => void
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', width: '100%',
      background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
      padding: '12px 0', gap: 2,
    }}>
      {/* Expand */}
      <IconBtn onClick={onToggleCollapse} title="Expand (⌘B)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </IconBtn>

      <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* New chat */}
      <IconBtn onClick={onNew} title="New conversation" accent>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </IconBtn>

      <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* Recent chats as dots */}
      {history.slice(0, 8).map((item) => (
        <motion.button
          key={item.id}
          whileTap={{ scale: 0.88 }}
          onClick={() => onSelect(item.id)}
          title={item.preview}
          style={{
            width: 34, height: 34, borderRadius: 9, border: 'none',
            background: item.id === currentId ? 'rgba(124,106,247,0.15)' : 'transparent',
            cursor: 'pointer', transition: 'background 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (item.id !== currentId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={(e) => {
            if (item.id !== currentId) e.currentTarget.style.background = 'transparent'
          }}
        >
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: item.id === currentId ? '#7C6AF7' : 'var(--text-3)',
          }} />
        </motion.button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Status dot */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginBottom: 6 }}
      />
    </div>
  )
}

// ─── Icon button helper ────────────────────────────────────────────
function IconBtn({ onClick, title, children, accent }: {
    onClick: () => void
    title: string
    children: React.ReactNode
    accent?: boolean
  }) {
    return (
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onClick}
        title={title}
        style={{
          width: 34, height: 34, borderRadius: 9, border: 'none',
          background: accent ? 'rgba(124,106,247,0.12)' : 'transparent',
          cursor: 'pointer', transition: 'background 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? '#9F97F9' : 'var(--text-3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = accent
            ? 'rgba(124,106,247,0.22)'
            : 'var(--bg-2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = accent
            ? 'rgba(124,106,247,0.12)'
            : 'transparent'
        }}
      >
        {children}
      </motion.button>
    )
  }

// ─── Main component ───────────────────────────────────────────────
export default function HistorySidebar({
  history, currentId, onSelect, onNew, onDelete, onPin,
  collapsed, onToggleCollapse,
}: Props) {
  const [search, setSearch]           = useState('')
  const [showQuick, setShowQuick]     = useState(false)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const searchRef                     = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (collapsed) {
    return (
      <CollapsedView
        history={history} currentId={currentId}
        onSelect={onSelect} onNew={onNew}
        onToggleCollapse={onToggleCollapse}
      />
    )
  }

  const filtered  = history.filter((h) => h.preview.toLowerCase().includes(search.toLowerCase()))
  const pinned    = filtered.filter((h) => h.pinned)
  const unpinned  = filtered.filter((h) => !h.pinned)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
    }}>

      {/* Top bar — collapse + new */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 10px 8px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Collapse */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleCollapse}
          title="Collapse (⌘B)"
          style={{
            width: 30, height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-2)'
            e.currentTarget.style.color = 'var(--text-1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </motion.button>

        {/* New conversation */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNew}
          style={{
            flex: 1, padding: '7px 10px',
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: 'rgba(124,106,247,0.1)',
            border: '1px solid rgba(124,106,247,0.2)',
            color: '#9F97F9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s', fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124,106,247,0.18)'
            e.currentTarget.style.borderColor = 'rgba(124,106,247,0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(124,106,247,0.1)'
            e.currentTarget.style.borderColor = 'rgba(124,106,247,0.2)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New chat
        </motion.button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', borderRadius: 8,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          transition: 'border-color 0.15s',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search...  ⌘K"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', fontSize: 12, color: 'var(--text-2)',
              fontFamily: 'var(--font-body)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: 13, lineHeight: 1, padding: 0,
              }}
            >×</button>
          )}
        </div>
      </div>

      {/* Quick queries — collapsed by default */}
      <div style={{ padding: '6px 10px 0' }}>
        <button
          onClick={() => setShowQuick((p) => !p)}
          style={{
            width: '100%', background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 4px', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
            letterSpacing: '0.09em', fontFamily: 'var(--font-body)',
          }}
        >
          <span>QUICK QUERIES</span>
          <motion.span
            animate={{ rotate: showQuick ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ fontSize: 9, display: 'inline-block', opacity: 0.6 }}
          >▼</motion.span>
        </button>

        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: 'hidden' }}
            >
              {QUICK_QUERIES.map((q) => (
                <button
                  key={q.query}
                  onClick={() => onSelect('__quick__' + q.query)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 4px', borderRadius: 6,
                    fontSize: 12, color: 'var(--text-2)',
                    fontFamily: 'var(--font-body)', textAlign: 'left',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{q.icon}</span>
                  <span>{q.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px 0' }} />

      {/* History list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>

        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            <SectionLabel>📌 PINNED</SectionLabel>
            {pinned.map((item, i) => (
              <Row key={item.id} item={item} isActive={item.id === currentId}
                index={i} onSelect={onSelect} onDelete={onDelete} onPin={onPin}
                onContextMenu={(id, x, y) => setContextMenu({ id, x, y })}
              />
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px 4px' }} />
          </>
        )}

        {/* Recent */}
        {unpinned.length > 0 && (
          <>
            <SectionLabel>RECENT</SectionLabel>
            {unpinned.map((item, i) => (
              <Row key={item.id} item={item} isActive={item.id === currentId}
                index={i} onSelect={onSelect} onDelete={onDelete} onPin={onPin}
                onContextMenu={(id, x, y) => setContextMenu({ id, x, y })}
              />
            ))}
          </>
        )}

        {history.length === 0 && (
          <div style={{
            padding: '16px 14px', fontSize: 12,
            color: 'var(--text-3)', fontFamily: 'var(--font-body)',
            textAlign: 'center', fontStyle: 'italic',
          }}>
            No conversations yet.<br />Ask your first question below.
          </div>
        )}

        {search && filtered.length === 0 && history.length > 0 && (
          <div style={{
            padding: '12px 14px', fontSize: 12,
            color: 'var(--text-3)', fontFamily: 'var(--font-body)',
            textAlign: 'center',
          }}>
            No results for &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: contextMenu.x, top: contextMenu.y,
              background: 'var(--bg-3)', border: '1px solid var(--border-md)',
              borderRadius: 10, padding: 4, zIndex: 1000, minWidth: 150,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <CtxItem
              icon="📌"
              label="Pin / Unpin"
              onClick={() => { onPin?.(contextMenu.id); setContextMenu(null) }}
            />
            <CtxItem
              icon="🗑"
              label="Delete"
              danger
              onClick={() => { onDelete?.(contextMenu.id); setContextMenu(null) }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer status */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            Oracle 19c · Live
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          {history.length} chat{history.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '2px 14px 3px', fontSize: 10, fontWeight: 600,
      color: 'var(--text-3)', letterSpacing: '0.09em',
      fontFamily: 'var(--font-body)',
    }}>{children}</div>
  )
}

function CtxItem({ icon, label, danger, onClick }: {
  icon: string; label: string; danger?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'none', border: 'none',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 7,
        fontSize: 12, cursor: 'pointer', textAlign: 'left',
        color: danger ? 'var(--red)' : 'var(--text-2)',
        fontFamily: 'var(--font-body)', transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      <span style={{ fontSize: 12 }}>{icon}</span>{label}
    </button>
  )
}

function Row({ item, isActive, index, onSelect, onDelete, onPin, onContextMenu }: {
  item: HistoryItem; isActive: boolean; index: number
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  onPin?: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(item.id, e.clientX, e.clientY) }}
      onClick={() => onSelect(item.id)}
      style={{
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        borderLeft: isActive ? '2px solid #7C6AF7' : '2px solid transparent',
        background: isActive ? 'rgba(124,106,247,0.07)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'all 0.12s',
      }}
    >
      <div style={{ flex: 1, padding: '7px 12px 7px 12px', minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: isActive ? '#9F97F9' : 'var(--text-2)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 1, fontFamily: 'var(--font-body)',
        }}>
          {item.pinned && <span style={{ marginRight: 3, fontSize: 9 }}>📌</span>}
          {item.preview}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          {timeAgo(item.timestamp)}
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ display: 'flex', gap: 2, paddingRight: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onPin && (
              <ActionBtn onClick={() => onPin(item.id)} title="Pin">📌</ActionBtn>
            )}
            {onDelete && (
              <ActionBtn onClick={() => onDelete(item.id)} title="Delete" danger>🗑</ActionBtn>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ActionBtn({ onClick, title, danger, children }: {
  onClick: () => void; title: string; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer',
        background: danger ? 'rgba(224,82,82,0.12)' : 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
      }}
    >{children}</button>
  )
}