'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface Props { filters: string[]; onRemove: (f: string) => void }

export default function FilterChips({ filters, onRemove }: Props) {
  if (filters.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
      <span style={{ fontSize: 10, color: 'var(--text-3)', alignSelf: 'center', letterSpacing: '0.07em', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
        FILTERS
      </span>
      <AnimatePresence>
        {filters.map(f => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.15 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px 3px 11px', borderRadius: 99,
              background: 'var(--accent-glow)', border: '1px solid rgba(108,92,231,0.28)',
              fontSize: 11, color: 'var(--accent-3)', fontFamily: 'var(--font-body)',
            }}
          >
            {f}
            <button
              onClick={() => onRemove(f)}
              style={{ width: 14, height: 14, borderRadius: '50%', border: 'none', background: 'rgba(108,92,231,0.3)', color: 'var(--accent-2)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}