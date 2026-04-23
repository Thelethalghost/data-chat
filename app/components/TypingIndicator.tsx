'use client'
import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex gap-3 items-start"
    >
      <div style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        background: 'var(--bg-2)', border: '1px solid var(--border-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }}
        />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '10px 16px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
      }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }}
          />
        ))}
      </div>
    </motion.div>
  )
}