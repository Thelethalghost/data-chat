'use client'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler)

ChartJS.defaults.color = '#8B92A5'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.05)'
ChartJS.defaults.font.family = 'DM Sans'

const C = ['#7C6AF7','#1DB37B','#E8A045','#E05252','#38BDF8','#F472B6']
const CA = ['rgba(124,106,247,0.75)','rgba(29,179,123,0.75)','rgba(232,160,69,0.75)',
            'rgba(224,82,82,0.75)','rgba(56,189,248,0.75)','rgba(244,114,182,0.75)']

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#161B26',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#F0F2F5',
      bodyColor: '#8B92A5',
      padding: 12,
      cornerRadius: 10,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)' },
      ticks: { color: '#4A5168', font: { size: 11 } },
      border: { color: 'rgba(255,255,255,0.06)' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.03)' },
      ticks: { color: '#4A5168', font: { size: 11 } },
      border: { color: 'rgba(255,255,255,0.06)' },
    },
  },
}

interface Props {
  chartType: string
  data: Record<string, unknown>[]
  columns: string[]
}

export default function ChartRenderer({ chartType, data, columns }: Props) {
  if (!data || data.length === 0) return null

  const labelCol = columns[0]
  const valueCol = columns[1]
  const labels = data.map((r) => String(r[labelCol] ?? ''))
  const values = data.map((r) => Number(r[valueCol]) || 0)

  // Single value display
  if (chartType === 'single_value') {
    const val = values[0]
    const formatted = val > 10000000
      ? `₹${(val / 10000000).toFixed(1)}Cr`
      : val > 100000
      ? `₹${(val / 100000).toFixed(1)}L`
      : val?.toLocaleString('en-IN')
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 0 8px',
        }}
      >
        <div style={{
          fontSize: 48, fontWeight: 700, fontFamily: 'Syne',
          background: 'linear-gradient(135deg, #7C6AF7 0%, #9F97F9 50%, #C4BEF9 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>{formatted}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, letterSpacing: '0.08em' }}>
          {labelCol?.replace(/_/g, ' ')}
        </div>
      </motion.div>
    )
  }

  // Table
  if (chartType === 'table') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ overflowX: 'auto', marginTop: 12, borderRadius: 12, border: '1px solid var(--border)' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-2)' }}>
              {columns.map((col) => (
                <th key={col} style={{
                  padding: '10px 16px', textAlign: 'left',
                  color: 'var(--text-3)', fontWeight: 500,
                  fontSize: 11, letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  background: i % 2 === 0 ? 'var(--bg-1)' : 'rgba(28,35,51,0.4)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {columns.map((col) => (
                  <td key={col} style={{ padding: '10px 16px', color: 'var(--text-2)' }}>
                    {typeof row[col] === 'number'
                      ? Number(row[col]).toLocaleString('en-IN')
                      : String(row[col] ?? '')}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    )
  }

  // Charts
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{
        marginTop: 14, borderRadius: 14, padding: '16px 16px 12px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        height: 240,
      }}
    >
      {chartType === 'bar' && (
        <Bar
          data={{
            labels,
            datasets: [{
              data: values,
              backgroundColor: CA,
              borderColor: C,
              borderWidth: 1,
              borderRadius: 6,
              borderSkipped: false,
            }],
          }}
          options={BASE_OPTS as never}
        />
      )}
      {chartType === 'line' && (
        <Line
          data={{
            labels,
            datasets: [{
              data: values,
              borderColor: '#7C6AF7',
              backgroundColor: 'rgba(124,106,247,0.08)',
              borderWidth: 2,
              pointBackgroundColor: '#7C6AF7',
              pointBorderColor: '#161B26',
              pointBorderWidth: 2,
              pointRadius: 5,
              fill: true,
              tension: 0.4,
            }],
          }}
          options={BASE_OPTS as never}
        />
      )}
      {chartType === 'pie' && (
        <Doughnut
          data={{
            labels,
            datasets: [{
              data: values,
              backgroundColor: CA,
              borderColor: '#0D1117',
              borderWidth: 2,
              hoverOffset: 4,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                display: true,
                position: 'right' as const,
                labels: {
                  color: '#8B92A5', boxWidth: 10, boxHeight: 10,
                  font: { size: 11, family: 'DM Sans' }, padding: 12,
                },
              },
              tooltip: {
                backgroundColor: '#161B26', borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1, titleColor: '#F0F2F5', bodyColor: '#8B92A5',
                padding: 12, cornerRadius: 10, displayColors: false,
              },
            },
          }}
        />
      )}
    </motion.div>
  )
}