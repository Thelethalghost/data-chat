'use client'
import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: 'var(--bg-3)', border: '1px solid var(--border-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-2)' }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        height: 42,
      }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.14 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)' }}
          />
        ))}
      </div>
    </motion.div>
  )
}