'use client'

import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)
ChartJS.defaults.color       = '#7F8699'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)'
ChartJS.defaults.font.family = 'Instrument Sans'

const C  = ['#6C5CE7','#00B894','#FDCB6E','#E17055','#74B9FF','#FD79A8']
const CA = ['rgba(108,92,231,0.75)','rgba(0,184,148,0.75)','rgba(253,203,110,0.75)','rgba(225,112,85,0.75)','rgba(116,185,255,0.75)','rgba(253,121,168,0.75)']

const TOOLTIP = {
  backgroundColor: '#1A2030', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
  titleColor: '#ECEEF5', bodyColor: '#7F8699', padding: 10, cornerRadius: 8, displayColors: false,
}
const SCALE = {
  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 10 } }, border: { color: 'transparent' } },
  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 10 } }, border: { color: 'transparent' } },
}
const BASE_OPTS = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: TOOLTIP }, scales: SCALE }

interface Props { chartType: string; data: Record<string, unknown>[]; columns: string[]; isMobile?: boolean }

function ChartBox({ children, isMobile }: { children: React.ReactNode; isMobile?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
      style={{ marginTop: 10, borderRadius: 12, padding: '13px 13px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', height: isMobile ? 170 : 220 }}>
      {children}
    </motion.div>
  )
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n }
  return 0
}

// Resolve actual numeric y-columns from the data, validating against declared y_keys
function resolveYKeys(data: Record<string, unknown>[], xKey: string, declaredY: string[]): string[] {
  if (!data.length) return declaredY
  const allKeys = Object.keys(data[0])
  const isNumeric = (k: string) => k !== xKey && data.some(r =>
    typeof r[k] === 'number' || (typeof r[k] === 'string' && (r[k] as string) !== '' && !isNaN(parseFloat(r[k] as string)))
  )
  const validDeclared = declaredY.filter(k => allKeys.includes(k) && isNumeric(k))
  if (validDeclared.length > 0) return validDeclared
  const fallback = allKeys.filter(isNumeric)
  return fallback.length > 0 ? [fallback[0]] : []
}

export default function ChartRenderer({ chartType, data, columns, isMobile = false }: Props) {
  if (!data || data.length === 0) return null

  const xKey      = columns[0]
  const declaredY = columns.slice(1)
  const yKeys     = resolveYKeys(data, xKey, declaredY)
  const labels    = data.map(r => String(r[xKey] ?? ''))

  // ── 1. Single value ──────────────────────────────────────────────
  if (chartType === 'single_value') {
    const val = toNum(data[0]?.[yKeys[0] || xKey])
    const fmt = val > 1e7 ? `₹${(val/1e7).toFixed(1)}Cr` : val > 1e5 ? `₹${(val/1e5).toFixed(1)}L` : val.toLocaleString('en-IN')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 0 8px' }}>
        <div style={{ fontSize: isMobile ? 40 : 52, fontFamily: 'var(--font-display)', color: 'var(--accent-2)', lineHeight: 1 }}>{fmt}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>
          {String(yKeys[0] || xKey).replace(/_/g, ' ').toUpperCase()}
        </div>
      </motion.div>
    )
  }

  // ── 2. Table ─────────────────────────────────────────────────────
  if (chartType === 'table') {
    const allCols = Object.keys(data[0])
    const visibleCols = isMobile ? allCols.slice(0, 3) : allCols
    return (
      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        style={{ overflowX: 'auto', marginTop: 10, borderRadius: 12, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 12 : 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-3)' }}>
              {visibleCols.map(col => (
                <th key={col} style={{ padding: isMobile ? '8px 10px' : '9px 13px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 500, fontSize: 10, letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                  {col.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, isMobile ? 8 : 50).map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-2)' : 'rgba(26,32,48,0.5)', borderBottom: '1px solid var(--border)' }}>
                {visibleCols.map(col => {
                  const val = row[col]
                  const n = typeof val === 'number' ? val : parseFloat(String(val))
                  const display = !isNaN(n) && typeof val !== 'boolean' && String(val) !== ''
                    ? n > 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n > 1e5 ? `₹${(n/1e5).toFixed(2)}L` : n % 1 !== 0 ? n.toFixed(2) : n.toLocaleString('en-IN')
                    : String(val ?? '')
                  return (
                    <td key={col} style={{ padding: isMobile ? '7px 10px' : '8px 13px', color: 'var(--text-2)', maxWidth: isMobile ? 90 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {isMobile && data.length > 8 && (
          <div style={{ padding: '5px', fontSize: 10, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>Showing 8 of {data.length} rows</div>
        )}
      </motion.div>
    )
  }

  // ── 3. Bar ───────────────────────────────────────────────────────
  if (chartType === 'bar') {
    const values = data.map(r => toNum(r[yKeys[0]]))
    return (
      <ChartBox isMobile={isMobile}>
        <Bar
          data={{ labels, datasets: [{ data: values, backgroundColor: data.map((_, i) => CA[i % CA.length]), borderColor: 'transparent', borderWidth: 0, borderRadius: 5, borderSkipped: false }] }}
          options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, tooltip: { ...TOOLTIP, callbacks: { label: (ctx) => { const v = ctx.parsed.y; return v > 1e7 ? `₹${(v/1e7).toFixed(2)}Cr` : v > 1e5 ? `₹${(v/1e5).toFixed(2)}L` : v.toLocaleString('en-IN') } } } } } as never}
        />
      </ChartBox>
    )
  }

  // ── 4. Grouped bar ───────────────────────────────────────────────
  if (chartType === 'grouped_bar') {
    const datasets = yKeys.map((col, i) => ({
      label: col.replace(/_/g, ' '),
      data: data.map(r => toNum(r[col])),
      backgroundColor: CA[i % CA.length], borderColor: 'transparent', borderWidth: 0, borderRadius: 4, borderSkipped: false,
    }))
    return (
      <ChartBox isMobile={isMobile}>
        <Bar data={{ labels, datasets }} options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: true, position: 'top' as const, labels: { color: '#7F8699', boxWidth: 8, boxHeight: 8, font: { size: 10 }, padding: 12 } } } } as never} />
      </ChartBox>
    )
  }

  // ── 5. Line ──────────────────────────────────────────────────────
  if (chartType === 'line') {
    const datasets = yKeys.map((col, i) => ({
      label: col.replace(/_/g, ' '),
      data: data.map(r => toNum(r[col])),
      borderColor: C[i % C.length], backgroundColor: CA[i % CA.length].replace('0.75', '0.06'),
      borderWidth: 2, pointBackgroundColor: C[i % C.length], pointBorderColor: 'var(--bg-1)', pointBorderWidth: 2,
      pointRadius: isMobile ? 3 : 4, fill: i === 0, tension: 0.4,
    }))
    return (
      <ChartBox isMobile={isMobile}>
        <Line data={{ labels, datasets }} options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: yKeys.length > 1, position: 'top' as const, labels: { color: '#7F8699', boxWidth: 8, boxHeight: 8, font: { size: 10 }, padding: 12 } } } } as never} />
      </ChartBox>
    )
  }

  // ── 6. Histogram ─────────────────────────────────────────────────
  if (chartType === 'histogram') {
    const values = data.map(r => toNum(r[yKeys[0]]))
    const min = Math.min(...values), max = Math.max(...values)
    const bCount = Math.min(isMobile ? 7 : 10, Math.ceil(Math.sqrt(values.length)))
    const bSize  = (max - min) / bCount || 1
    const bins: number[] = Array(bCount).fill(0)
    values.forEach(v => { bins[Math.min(Math.floor((v - min) / bSize), bCount - 1)]++ })
    const binLabels = bins.map((_, i) => `${(min + i * bSize).toFixed(0)}–${(min + (i+1) * bSize).toFixed(0)}`)
    return (
      <ChartBox isMobile={isMobile}>
        <Bar data={{ labels: binLabels, datasets: [{ data: bins, backgroundColor: 'rgba(108,92,231,0.7)', borderColor: 'transparent', borderWidth: 0, borderRadius: 3, borderSkipped: false }] }} options={BASE_OPTS as never} />
      </ChartBox>
    )
  }

  // ── 7. Pie ───────────────────────────────────────────────────────
  if (chartType === 'pie') {
    const values = data.map(r => toNum(r[yKeys[0]]))
    return (
      <ChartBox isMobile={isMobile}>
        <Doughnut
          data={{ labels, datasets: [{ data: values, backgroundColor: CA, borderColor: 'var(--bg-1)', borderWidth: 2, hoverOffset: 4 }] }}
          options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: true, position: isMobile ? 'bottom' as const : 'right' as const, labels: { color: '#7F8699', boxWidth: 8, boxHeight: 8, font: { size: 10 }, padding: isMobile ? 8 : 10 } }, tooltip: TOOLTIP } }}
        />
      </ChartBox>
    )
  }

  return null
}