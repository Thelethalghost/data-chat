'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from '../page'

interface HistoryItem {
  id: string; preview: string; timestamp: Date; pinned?: boolean
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
  icons: typeof Icons
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const QUICK_QUERIES = [
  { label: 'DPD breakdown',    query: 'Show DPD bucket distribution' },
  { label: 'Top agents',      query: 'Top 10 agents by recovery rate this month' },
  { label: 'Roll rates',      query: 'Roll rates over last 3 months' },
  { label: 'Hindi query',     query: 'इस महीने सबसे ज़्यादा recovery किसने की?' },
]

function CollapsedView({ history, currentId, onSelect, onNew, onToggleCollapse, icons }: {
  history: HistoryItem[]; currentId: string | null
  onSelect: (id: string) => void; onNew: () => void
  onToggleCollapse: () => void; icons: typeof Icons
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', width: '100%',
      background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
      padding: '10px 0', gap: 3,
    }}>
      <SideBtn onClick={onToggleCollapse} title="Expand (⌘B)">{icons.chevRight(13)}</SideBtn>
      <div style={{ width: 20, height: 1, background: 'var(--border)', margin: '3px 0' }} />
      <SideBtn onClick={onNew} title="New conversation" accent>{icons.plus(12)}</SideBtn>
      <div style={{ width: 20, height: 1, background: 'var(--border)', margin: '3px 0' }} />
      {history.slice(0, 8).map(item => (
        <motion.button
          key={item.id} whileTap={{ scale: 0.88 }}
          onClick={() => onSelect(item.id)} title={item.preview}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: item.id === currentId ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.id === currentId ? 'var(--accent-2)' : 'var(--text-3)' }} />
        </motion.button>
      ))}
      <div style={{ flex: 1 }} />
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginBottom: 6 }}
      />
    </div>
  )
}

function SideBtn({ onClick, title, children, accent }: {
  onClick: () => void; title: string; children: React.ReactNode; accent?: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick} title={title}
      style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: accent ? 'var(--accent-glow)' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent ? 'var(--accent-2)' : 'var(--text-2)', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = accent ? 'rgba(108,92,231,0.25)' : 'var(--bg-3)' }}
      onMouseLeave={e => { e.currentTarget.style.background = accent ? 'var(--accent-glow)' : 'transparent' }}
    >
      {children}
    </motion.button>
  )
}

export default function HistorySidebar({ history, currentId, onSelect, onNew, onDelete, onPin, collapsed, onToggleCollapse, icons }: Props) {
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
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (collapsed) return <CollapsedView history={history} currentId={currentId} onSelect={onSelect} onNew={onNew} onToggleCollapse={onToggleCollapse} icons={icons} />

  const filtered = history.filter(h => h.preview.toLowerCase().includes(search.toLowerCase()))
  const pinned   = filtered.filter(h => h.pinned)
  const unpinned = filtered.filter(h => !h.pinned)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)', borderRight: '1px solid var(--border)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleCollapse}
          title="Collapse (⌘B)"
          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          {icons.chevLeft(12)}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onNew}
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--border-md)',
            color: 'var(--text-2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-body)', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
        >
          {icons.plus(11)}
          New chat
        </motion.button>
      </div>

      {/* Search */}
      <div style={{ padding: '7px 10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-3)', display: 'flex', flexShrink: 0 }}>{icons.search(11)}</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search  ⌘K"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* Quick queries */}
      <div style={{ padding: '6px 10px 0' }}>
        <button
          onClick={() => setShowQuick(p => !p)}
          style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}
        >
          <span>QUICK QUERIES</span>
          <motion.span animate={{ rotate: showQuick ? 180 : 0 }} transition={{ duration: 0.15 }} style={{ fontSize: 8, display: 'inline-block', opacity: 0.5 }}>▼</motion.span>
        </button>

        <AnimatePresence>
          {showQuick && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
              {QUICK_QUERIES.map(q => (
                <button
                  key={q.query}
                  onClick={() => onSelect('__quick__' + q.query)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px 2px', borderRadius: 6, fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'color 0.1s', gap: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}
                >
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                  {q.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px 0' }} />

      {/* History list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
        {pinned.length > 0 && (
          <>
            <SectionLabel>PINNED</SectionLabel>
            {pinned.map((item, i) => (
              <Row key={item.id} item={item} isActive={item.id === currentId} index={i} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onContextMenu={(id, x, y) => setContextMenu({ id, x, y })} icons={icons} />
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px' }} />
          </>
        )}

        {unpinned.length > 0 && (
          <>
            <SectionLabel>RECENT</SectionLabel>
            {unpinned.map((item, i) => (
              <Row key={item.id} item={item} isActive={item.id === currentId} index={i} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onContextMenu={(id, x, y) => setContextMenu({ id, x, y })} icons={icons} />
            ))}
          </>
        )}

        {history.length === 0 && (
          <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6 }}>
            No conversations yet.<br />Ask your first question.
          </div>
        )}

        {search && filtered.length === 0 && history.length > 0 && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
            No results for &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.1 }}
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: 10, padding: 4, zIndex: 1000, minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            {/* Find if this item is pinned */}
            {(() => {
              const item = history.find(h => h.id === contextMenu.id)
              const isPinned = item?.pinned
              return [
                { label: isPinned ? 'Unpin' : 'Pin', icon: isPinned ? icons.unpin : icons.pin, action: () => { onPin?.(contextMenu.id); setContextMenu(null) }, danger: false },
                { label: 'Delete', icon: icons.trash, action: () => { onDelete?.(contextMenu.id); setContextMenu(null) }, danger: true },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: item.danger ? 'var(--red)' : 'var(--text-2)', fontFamily: 'var(--font-body)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <span style={{ display: 'flex' }}>{item.icon()}</span>
                  {item.label}
                </button>
              ))
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>PostgreSQL · Live</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{history.length} chat{history.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '2px 14px 3px', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}>{children}</div>
}

function Row({ item, isActive, index, onSelect, onDelete, onPin, onContextMenu, icons }: {
  item: HistoryItem; isActive: boolean; index: number
  onSelect: (id: string) => void; onDelete?: (id: string) => void; onPin?: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void; icons: typeof Icons
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(item.id, e.clientX, e.clientY) }}
      onClick={() => onSelect(item.id)}
      style={{
        display: 'flex', alignItems: 'center', cursor: 'pointer',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        background: isActive ? 'var(--accent-glow)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'all 0.1s',
      }}
    >
      <div style={{ flex: 1, padding: '7px 12px', minWidth: 0 }}>
        <div style={{ fontSize: 12, color: isActive ? 'var(--accent-3)' : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1, fontFamily: 'var(--font-body)', fontWeight: isActive ? 500 : 400 }}>
          {item.pinned && (
            <span style={{ marginRight: 5, color: 'var(--accent-2)', display: 'inline-flex', verticalAlign: 'middle' }}>
              {icons.pin(9)}
            </span>
          )}
          {item.preview}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{timeAgo(item.timestamp)}</div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ display: 'flex', gap: 2, paddingRight: 6 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Fix 4: Pin/unpin with proper icon and tooltip via title attr */}
            {onPin && (
              <button
                onClick={() => onPin(item.id)}
                title={item.pinned ? 'Unpin' : 'Pin'}
                style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: item.pinned ? 'var(--accent-glow)' : 'var(--bg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.pinned ? 'var(--accent-2)' : 'var(--text-2)' }}
              >
                {item.pinned ? icons.unpin(9) : icons.pin(9)}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id)}
                title="Delete"
                style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'rgba(225,112,85,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}
              >
                {icons.trash(9)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}