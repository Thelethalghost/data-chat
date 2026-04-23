'use client'

import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Filler)

ChartJS.defaults.color = '#8B92A5'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)'
ChartJS.defaults.font.family = 'Instrument Sans'

const TOOLTIP = {
  backgroundColor: '#161B26',
  borderColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  titleColor: '#F0F2F5',
  bodyColor: '#8B92A5',
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
}

const SCALE = {
  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4A5168', font: { size: 11 } }, border: { color: 'transparent' } },
  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4A5168', font: { size: 11 } }, border: { color: 'transparent' } },
}

// ── MOCK DATA (replace with real Oracle queries on hackathon day) ──

const AGENT_DATA = {
  labels: ['Priya S.', 'Arjun M.', 'Kavya R.', 'Rahul K.', 'Sneha P.', 'Vikram S.', 'Anjali N.', 'Deepak J.'],
  datasets: [{
    data: [78.4, 71.2, 65.8, 61.3, 58.9, 55.1, 52.6, 49.8],
    backgroundColor: ['rgba(124,106,247,0.85)', 'rgba(124,106,247,0.75)', 'rgba(124,106,247,0.65)',
      'rgba(124,106,247,0.55)', 'rgba(124,106,247,0.48)', 'rgba(124,106,247,0.40)',
      'rgba(124,106,247,0.33)', 'rgba(124,106,247,0.26)'],
    borderColor: 'rgba(124,106,247,0.9)',
    borderWidth: 1, borderRadius: 6, borderSkipped: false,
  }],
}

const ROLL_DATA = {
  labels: ['Aug 25', 'Sep 25', 'Oct 25'],
  datasets: [
    {
      label: '30→60 DPD',
      data: [18.2, 19.8, 21.3],
      borderColor: '#7C6AF7', backgroundColor: 'rgba(124,106,247,0.08)',
      borderWidth: 2, pointBackgroundColor: '#7C6AF7', pointRadius: 5,
      fill: true, tension: 0.4,
    },
    {
      label: '60→90 DPD',
      data: [12.4, 13.1, 14.7],
      borderColor: '#E8A045', backgroundColor: 'rgba(232,160,69,0.06)',
      borderWidth: 2, pointBackgroundColor: '#E8A045', pointRadius: 5,
      fill: true, tension: 0.4,
    },
    {
      label: '90+ DPD',
      data: [8.1, 8.9, 9.6],
      borderColor: '#E05252', backgroundColor: 'rgba(224,82,82,0.05)',
      borderWidth: 2, pointBackgroundColor: '#E05252', pointRadius: 5,
      fill: true, tension: 0.4,
    },
  ],
}

const CHANNEL_DATA = {
  labels: ['Phone', 'WhatsApp', 'Field Visit', 'SMS', 'Email'],
  datasets: [{
    data: [48.2, 31.5, 22.1, 12.8, 8.4],
    backgroundColor: ['rgba(124,106,247,0.8)', 'rgba(29,179,123,0.8)',
      'rgba(232,160,69,0.8)', 'rgba(56,189,248,0.8)', 'rgba(244,114,182,0.8)'],
    borderColor: '#0D1117', borderWidth: 2, hoverOffset: 6,
  }],
}

const DPD_DATA = {
  labels: ['1–30', '31–60', '61–90', '91–180', '180+'],
  datasets: [{
    data: [8420, 4230, 2180, 1450, 890],
    backgroundColor: ['rgba(29,179,123,0.75)', 'rgba(124,106,247,0.75)',
      'rgba(232,160,69,0.75)', 'rgba(224,82,82,0.65)', 'rgba(224,82,82,0.45)'],
    borderColor: 'transparent', borderRadius: 6, borderSkipped: false,
  }],
}

const METRICS = [
  { label: 'Total Outstanding', value: '₹284.7 Cr', delta: '+2.3%', up: false, color: '#7C6AF7' },
  { label: 'Overall Recovery Rate', value: '62.4%', delta: '+1.8%', up: true, color: '#1DB37B' },
  { label: 'Active Accounts', value: '17,140', delta: '-342', up: false, color: '#E8A045' },
  { label: 'PTP Fulfillment', value: '68.2%', delta: '+3.1%', up: true, color: '#38BDF8' },
  { label: 'Avg DPD', value: '47 days', delta: '+2.1', up: false, color: '#E05252' },
  { label: 'Agents Active', value: '84', delta: '0', up: true, color: '#9F97F9' },
]

const INSIGHTS = [
  { icon: '↗', color: '#1DB37B', bg: 'rgba(29,179,123,0.1)', border: 'rgba(29,179,123,0.2)', text: 'WhatsApp recovering 2.4× more per contact than SMS this month' },
  { icon: '⚠', color: '#E8A045', bg: 'rgba(232,160,69,0.1)', border: 'rgba(232,160,69,0.2)', text: 'Roll rate 30→60 DPD increased 3.1pts — 842 accounts at risk' },
  { icon: '🏆', color: '#7C6AF7', bg: 'rgba(124,106,247,0.1)', border: 'rgba(124,106,247,0.2)', text: 'Priya Sharma is 23pts above team avg — highest PTP quality' },
  { icon: '📍', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)', text: 'Maharashtra portfolio trailing national recovery avg by 8.2%' },
]

function MetricCard({ m, i }: { m: typeof METRICS[0], i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 10, fontWeight: 500 }}>
        {m.label.toUpperCase()}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 30,
        letterSpacing: '0.04em', color: m.color, lineHeight: 1, marginBottom: 8,
      }}>
        {m.value}
      </div>
      <div style={{
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
        color: m.up ? '#1DB37B' : '#E05252',
      }}>
        <span>{m.up ? '▲' : '▼'}</span>
        <span>{m.delta} vs last month</span>
      </div>
    </motion.div>
  )
}

function ChartCard({ title, subtitle, children, delay = 0 }: {
  title: string, subtitle: string, children: React.ReactNode, delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 20px 16px',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{subtitle}</div>
      </div>
      {children}
    </motion.div>
  )
}

export default function AnalyticsPage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 28,
          letterSpacing: '0.08em', color: 'var(--text-1)', marginBottom: 4,
        }}>PORTFOLIO ANALYTICS</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          Live snapshot · CreditNirvana Oracle DB · Updated on load
        </p>
      </motion.div>

      {/* AI Insights strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
        {INSIGHTS.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: ins.bg, border: `1px solid ${ins.border}`,
            }}
          >
            <span style={{ fontSize: 16, color: ins.color, flexShrink: 0 }}>{ins.icon}</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>
              {ins.text}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {METRICS.map((m, i) => <MetricCard key={m.label} m={m} i={i} />)}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Agent Recovery Rate" subtitle="Top 8 agents · October 2025" delay={0.1}>
          <div style={{ height: 220 }}>
            <Bar data={AGENT_DATA} options={{
              responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
              plugins: { legend: { display: false }, tooltip: TOOLTIP },
              scales: SCALE,
            }} />
          </div>
        </ChartCard>

        <ChartCard title="Recovery by Channel" subtitle="Amount recovered (₹Cr) · this month" delay={0.15}>
          <div style={{ height: 220 }}>
            <Doughnut data={CHANNEL_DATA} options={{
              responsive: true, maintainAspectRatio: false, cutout: '62%',
              plugins: {
                legend: {
                  display: true, position: 'bottom' as const,
                  labels: { color: '#8B92A5', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 },
                },
                tooltip: TOOLTIP,
              },
            }} />
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Roll Rate Trend" subtitle="% accounts moving to worse DPD bucket" delay={0.2}>
          <div style={{ height: 200 }}>
            <Line data={ROLL_DATA} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true, position: 'top' as const,
                  labels: { color: '#8B92A5', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 16 },
                },
                tooltip: TOOLTIP,
              },
              scales: SCALE,
            }} />
          </div>
        </ChartCard>

        <ChartCard title="DPD Bucket Distribution" subtitle="Account count by days past due" delay={0.25}>
          <div style={{ height: 200 }}>
            <Bar data={DPD_DATA} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: TOOLTIP },
              scales: SCALE,
            }} />
          </div>
        </ChartCard>
      </div>

    </div>
  )
}