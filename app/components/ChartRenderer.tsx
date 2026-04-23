'use client'

import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler)

ChartJS.defaults.color       = '#8B92A5'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)'
ChartJS.defaults.font.family = 'Instrument Sans'

const C  = ['#7C6AF7','#1DB37B','#E8A045','#E05252','#38BDF8','#F472B6']
const CA = [
  'rgba(124,106,247,0.75)','rgba(29,179,123,0.75)','rgba(232,160,69,0.75)',
  'rgba(224,82,82,0.75)','rgba(56,189,248,0.75)','rgba(244,114,182,0.75)',
]

const TOOLTIP = {
  backgroundColor: '#161B26', borderColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1, titleColor: '#F0F2F5', bodyColor: '#8B92A5',
  padding: 10, cornerRadius: 8, displayColors: false,
}

const SCALE = {
  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4A5168', font: { size: 10 } }, border: { color: 'rgba(255,255,255,0.05)' } },
  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4A5168', font: { size: 10 } }, border: { color: 'rgba(255,255,255,0.05)' } },
}

const BASE_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: TOOLTIP },
  scales: SCALE,
}

interface Props {
  chartType: string
  data: Record<string, unknown>[]
  columns: string[]
  isMobile?: boolean
}

function ChartBox({ children, isMobile }: { children: React.ReactNode; isMobile?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        marginTop: 12, borderRadius: 12,
        padding: '14px 14px 10px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        height: isMobile ? 180 : 230,
      }}
    >
      {children}
    </motion.div>
  )
}

export default function ChartRenderer({ chartType, data, columns, isMobile = false }: Props) {
  if (!data || data.length === 0) return null

  const labelCol = columns[0]
  const valueCol = columns[1]
  const labels   = data.map((r) => String(r[labelCol] ?? ''))
  const values   = data.map((r) => Number(r[valueCol]) || 0)

  // ── 1. Single value ──────────────────────────────────────────
  if (chartType === 'single_value') {
    const val = values[0]
    const formatted =
      val > 10000000 ? `₹${(val / 10000000).toFixed(1)}Cr` :
      val > 100000   ? `₹${(val / 100000).toFixed(1)}L`   :
      val?.toLocaleString('en-IN')

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 6px' }}
      >
        <div style={{
          fontSize: isMobile ? 40 : 52, fontWeight: 700,
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, #7C6AF7, #9F97F9, #C4BEF9)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1, letterSpacing: '0.04em',
        }}>{formatted}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, letterSpacing: '0.07em' }}>
          {String(labelCol ?? '').replace(/_/g, ' ').toUpperCase()}
        </div>
      </motion.div>
    )
  }

  // ── 2. Table ─────────────────────────────────────────────────
  if (chartType === 'table') {
    // On mobile show max 3 columns
    const visibleCols = isMobile ? columns.slice(0, 3) : columns
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ overflowX: 'auto', marginTop: 10, borderRadius: 10, border: '1px solid var(--border)' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 12 : 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)' }}>
              {visibleCols.map((col) => (
                <th key={col} style={{
                  padding: isMobile ? '8px 10px' : '10px 14px', textAlign: 'left',
                  color: 'var(--text-3)', fontWeight: 500, fontSize: 10,
                  letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}>
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, isMobile ? 8 : 50).map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  background: i % 2 === 0 ? 'var(--bg-1)' : 'rgba(28,35,51,0.4)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {visibleCols.map((col) => (
                  <td key={col} style={{
                    padding: isMobile ? '7px 10px' : '9px 14px',
                    color: 'var(--text-2)', maxWidth: isMobile ? 100 : 200,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {typeof row[col] === 'number'
                      ? Number(row[col]).toLocaleString('en-IN')
                      : String(row[col] ?? '')}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
        {isMobile && data.length > 8 && (
          <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontStyle: 'italic' }}>
            Showing 8 of {data.length} rows
          </div>
        )}
      </motion.div>
    )
  }

  // ── 3. Bar ───────────────────────────────────────────────────
  if (chartType === 'bar') {
    return (
      <ChartBox isMobile={isMobile}>
        <Bar
          data={{ labels, datasets: [{ data: values, backgroundColor: CA, borderColor: C, borderWidth: 1, borderRadius: 5, borderSkipped: false }] }}
          options={BASE_OPTS as never}
        />
      </ChartBox>
    )
  }

  // ── 4. Grouped bar ───────────────────────────────────────────
  if (chartType === 'grouped_bar') {
    const hasThreeCols = columns.length >= 3
    const groupedLabels = hasThreeCols ? labels : [...new Set(data.map((_, i) => labels[i * 2]))]
    const seriesA = hasThreeCols ? data.map((r) => Number(r[columns[1]]) || 0) : values.filter((_, i) => i % 2 === 0)
    const seriesB = hasThreeCols ? data.map((r) => Number(r[columns[2]]) || 0) : values.filter((_, i) => i % 2 !== 0)
    const labelA  = hasThreeCols ? String(columns[1]).replace(/_/g, ' ') : 'Group A'
    const labelB  = hasThreeCols ? String(columns[2]).replace(/_/g, ' ') : 'Group B'

    return (
      <ChartBox isMobile={isMobile}>
        <Bar
          data={{
            labels: groupedLabels,
            datasets: [
              { label: labelA, data: seriesA, backgroundColor: 'rgba(124,106,247,0.75)', borderColor: '#7C6AF7', borderWidth: 1, borderRadius: 5, borderSkipped: false },
              { label: labelB, data: seriesB, backgroundColor: 'rgba(29,179,123,0.75)', borderColor: '#1DB37B', borderWidth: 1, borderRadius: 5, borderSkipped: false },
            ],
          }}
          options={{
            ...BASE_OPTS,
            plugins: {
              ...BASE_OPTS.plugins,
              legend: {
                display: true, position: 'top' as const,
                labels: { color: '#8B92A5', boxWidth: 9, boxHeight: 9, font: { size: 10 }, padding: 12 },
              },
            },
          } as never}
        />
      </ChartBox>
    )
  }

  // ── 5. Line ──────────────────────────────────────────────────
  if (chartType === 'line') {
    const seriesCols = columns.slice(1)
    const datasets = seriesCols.map((col, i) => ({
      label: col.replace(/_/g, ' '),
      data: data.map((r) => Number(r[col]) || 0),
      borderColor: C[i % C.length],
      backgroundColor: CA[i % CA.length].replace('0.75', '0.06'),
      borderWidth: 2, pointBackgroundColor: C[i % C.length],
      pointBorderColor: '#161B26', pointBorderWidth: 2, pointRadius: isMobile ? 3 : 4,
      fill: i === 0, tension: 0.4,
    }))

    return (
      <ChartBox isMobile={isMobile}>
        <Line
          data={{ labels, datasets }}
          options={{
            ...BASE_OPTS,
            plugins: {
              ...BASE_OPTS.plugins,
              legend: {
                display: seriesCols.length > 1, position: 'top' as const,
                labels: { color: '#8B92A5', boxWidth: 9, boxHeight: 9, font: { size: 10 }, padding: 12 },
              },
            },
          } as never}
        />
      </ChartBox>
    )
  }

  // ── 6. Histogram ─────────────────────────────────────────────
  if (chartType === 'histogram') {
    const raw = values
    const min = Math.min(...raw), max = Math.max(...raw)
    const bucketCount = Math.min(isMobile ? 7 : 10, Math.ceil(Math.sqrt(raw.length)))
    const bucketSize  = (max - min) / bucketCount || 1
    const bins: number[] = Array(bucketCount).fill(0)
    raw.forEach((v) => { bins[Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1)]++ })
    const binLabels = bins.map((_, i) => `${(min + i * bucketSize).toFixed(0)}–${(min + (i + 1) * bucketSize).toFixed(0)}`)

    return (
      <ChartBox isMobile={isMobile}>
        <Bar
          data={{ labels: binLabels, datasets: [{ label: 'Count', data: bins, backgroundColor: 'rgba(124,106,247,0.65)', borderColor: '#7C6AF7', borderWidth: 1, borderRadius: 3, borderSkipped: false }] }}
          options={{ ...BASE_OPTS, plugins: { ...BASE_OPTS.plugins, legend: { display: false } } } as never}
        />
      </ChartBox>
    )
  }

  // ── 7. Pie ───────────────────────────────────────────────────
  if (chartType === 'pie') {
    return (
      <ChartBox isMobile={isMobile}>
        <Doughnut
          data={{ labels, datasets: [{ data: values, backgroundColor: CA, borderColor: '#0D1117', borderWidth: 2, hoverOffset: 4 }] }}
          options={{
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: {
              legend: {
                display: true,
                position: isMobile ? 'bottom' as const : 'right' as const,
                labels: { color: '#8B92A5', boxWidth: 9, boxHeight: 9, font: { size: 10 }, padding: isMobile ? 8 : 11 },
              },
              tooltip: TOOLTIP,
            },
          }}
        />
      </ChartBox>
    )
  }

  return null
}