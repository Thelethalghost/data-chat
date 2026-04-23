'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface FilterChipsProps {
  filters: string[]
  onRemove: (f: string) => void
}

export default function FilterChips({ filters, onRemove }: FilterChipsProps) {
  if (filters.length === 0) return null
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 20px',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center', letterSpacing: '0.06em' }}>
        FILTERS
      </span>
      <AnimatePresence>
        {filters.map((f) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.85, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px 3px 12px', borderRadius: 99,
              background: 'rgba(124,106,247,0.12)',
              border: '1px solid rgba(124,106,247,0.25)',
              fontSize: 12, color: 'var(--accent-2)',
            }}
          >
            {f}
            <button
              onClick={() => onRemove(f)}
              style={{
                width: 14, height: 14, borderRadius: '50%', border: 'none',
                background: 'rgba(124,106,247,0.2)', color: 'var(--accent-2)',
                cursor: 'pointer', fontSize: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}