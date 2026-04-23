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

const TOOLTIP = {
  backgroundColor: '#1A2030', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
  titleColor: '#ECEEF5', bodyColor: '#7F8699', padding: 10, cornerRadius: 8, displayColors: false,
}
const SCALE = {
  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 11 } }, border: { color: 'transparent' } },
  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 11 } }, border: { color: 'transparent' } },
}

const AGENT_DATA = {
  labels: ['Priya S.', 'Arjun M.', 'Kavya R.', 'Rahul K.', 'Sneha P.', 'Vikram S.', 'Anjali N.', 'Deepak J.'],
  datasets: [{
    data: [78.4, 71.2, 65.8, 61.3, 58.9, 55.1, 52.6, 49.8],
    backgroundColor: ['rgba(108,92,231,0.9)','rgba(108,92,231,0.78)','rgba(108,92,231,0.66)','rgba(108,92,231,0.55)','rgba(108,92,231,0.45)','rgba(108,92,231,0.36)','rgba(108,92,231,0.28)','rgba(108,92,231,0.20)'],
    borderColor: 'transparent', borderRadius: 5, borderSkipped: false,
  }],
}
const ROLL_DATA = {
  labels: ['Aug 25', 'Sep 25', 'Oct 25'],
  datasets: [
    { label: '30→60 DPD', data: [18.2,19.8,21.3], borderColor: '#6C5CE7', backgroundColor: 'rgba(108,92,231,0.07)', borderWidth: 2, pointBackgroundColor: '#6C5CE7', pointRadius: 5, fill: true, tension: 0.4 },
    { label: '60→90 DPD', data: [12.4,13.1,14.7], borderColor: '#FDCB6E', backgroundColor: 'rgba(253,203,110,0.05)', borderWidth: 2, pointBackgroundColor: '#FDCB6E', pointRadius: 5, fill: true, tension: 0.4 },
    { label: '90+ DPD',   data: [8.1,8.9,9.6],    borderColor: '#E17055', backgroundColor: 'rgba(225,112,85,0.04)', borderWidth: 2, pointBackgroundColor: '#E17055', pointRadius: 5, fill: true, tension: 0.4 },
  ],
}
const CHANNEL_DATA = {
  labels: ['Phone', 'WhatsApp', 'Field Visit', 'SMS', 'Email'],
  datasets: [{ data: [48.2,31.5,22.1,12.8,8.4], backgroundColor: ['rgba(108,92,231,0.85)','rgba(0,184,148,0.85)','rgba(253,203,110,0.85)','rgba(116,185,255,0.85)','rgba(225,112,85,0.75)'], borderColor: '#06080F', borderWidth: 2, hoverOffset: 5 }],
}
const DPD_DATA = {
  labels: ['1–30', '31–60', '61–90', '91–180', '180+'],
  datasets: [{ data: [8420,4230,2180,1450,890], backgroundColor: ['rgba(0,184,148,0.8)','rgba(108,92,231,0.8)','rgba(253,203,110,0.8)','rgba(225,112,85,0.7)','rgba(225,112,85,0.4)'], borderColor: 'transparent', borderRadius: 6, borderSkipped: false }],
}

const METRICS = [
  { label: 'Total Outstanding', value: '₹284.7 Cr', delta: '+2.3%', up: false, color: 'var(--accent-2)' },
  { label: 'Recovery Rate',     value: '62.4%',      delta: '+1.8%', up: true,  color: 'var(--green)' },
  { label: 'Active Accounts',   value: '17,140',     delta: '−342',  up: false, color: 'var(--amber)' },
  { label: 'PTP Fulfillment',   value: '68.2%',      delta: '+3.1%', up: true,  color: '#74B9FF' },
  { label: 'Avg DPD',           value: '47 days',    delta: '+2.1',  up: false, color: 'var(--red)' },
  { label: 'Active Agents',     value: '84',          delta: 'stable', up: true, color: 'var(--accent-3)' },
]

const INSIGHTS = [
  { text: 'WhatsApp recovering 2.4× more per contact than SMS this month', type: 'up' },
  { text: 'Roll rate 30→60 DPD increased 3.1pts — 842 accounts at risk', type: 'warn' },
  { text: 'Priya Sharma is 23pts above team avg — highest PTP quality', type: 'up' },
  { text: 'Maharashtra portfolio trailing national recovery avg by 8.2%', type: 'info' },
]

const insightBg: Record<string, string> = {
  up: 'rgba(0,184,148,0.1)', warn: 'rgba(253,203,110,0.1)', info: 'rgba(116,185,255,0.1)',
}
const insightBorder: Record<string, string> = {
  up: 'rgba(0,184,148,0.22)', warn: 'rgba(253,203,110,0.2)', info: 'rgba(116,185,255,0.18)',
}
const insightColor: Record<string, string> = {
  up: 'var(--green)', warn: 'var(--amber)', info: '#74B9FF',
}
const insightIcon: Record<string, string> = {
  up: '↗', warn: '⚠', info: '→',
}

function MetricCard({ m, i }: { m: typeof METRICS[0]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}
    >
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
        {m.label.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', color: m.color, lineHeight: 1, marginBottom: 8 }}>
        {m.value}
      </div>
      <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: m.up ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-body)' }}>
        <span>{m.up ? '▲' : '▼'}</span>
        <span>{m.delta} vs last month</span>
      </div>
    </motion.div>
  )
}

function ChartCard({ title, subtitle, children, delay = 0 }: {
  title: string; subtitle: string; children: React.ReactNode; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 18px 14px' }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2, fontFamily: 'var(--font-body)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{subtitle}</div>
      </div>
      {children}
    </motion.div>
  )
}

interface Props { isMobile?: boolean }

export default function AnalyticsPage({ isMobile = false }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '22px 28px' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 24 : 30, letterSpacing: '0.08em', color: 'var(--text-1)', marginBottom: 4 }}>
          PORTFOLIO ANALYTICS
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
          Live snapshot · CreditNirvana Oracle DB · Updated on load
        </p>
      </motion.div>

      {/* AI Insights strip — 2×2 on desktop, stacked on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {INSIGHTS.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 13px', borderRadius: 10,
              background: insightBg[ins.type], border: `1px solid ${insightBorder[ins.type]}`,
            }}
          >
            <span style={{ fontSize: 14, color: insightColor[ins.type], flexShrink: 0, fontWeight: 600 }}>{insightIcon[ins.type]}</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{ins.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Metric cards — 6-col on desktop (restored), 2×3 on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {METRICS.map((m, i) => <MetricCard key={m.label} m={m} i={i} />)}
      </div>

      {/* Charts row 1 — restored 1.4fr / 1fr side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Agent Recovery Rate" subtitle="Top 8 agents · October 2025" delay={0.1}>
          <div style={{ height: isMobile ? 180 : 220 }}>
            <Bar data={AGENT_DATA} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false }, tooltip: TOOLTIP }, scales: SCALE }} />
          </div>
        </ChartCard>

        <ChartCard title="Recovery by Channel" subtitle="Amount recovered (₹Cr) · this month" delay={0.15}>
          <div style={{ height: isMobile ? 180 : 220 }}>
            <Doughnut data={CHANNEL_DATA} options={{
              responsive: true, maintainAspectRatio: false, cutout: '62%',
              plugins: {
                legend: { display: true, position: isMobile ? 'bottom' as const : 'bottom' as const, labels: { color: '#7F8699', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 } },
                tooltip: TOOLTIP,
              },
            }} />
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 — restored 1fr / 1fr side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Roll Rate Trend" subtitle="% accounts moving to worse DPD bucket" delay={0.2}>
          <div style={{ height: isMobile ? 180 : 200 }}>
            <Line data={ROLL_DATA} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: true, position: 'top' as const, labels: { color: '#7F8699', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 16 } }, tooltip: TOOLTIP },
              scales: SCALE,
            }} />
          </div>
        </ChartCard>

        <ChartCard title="DPD Bucket Distribution" subtitle="Account count by days past due" delay={0.25}>
          <div style={{ height: isMobile ? 180 : 200 }}>
            <Bar data={DPD_DATA} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: TOOLTIP }, scales: SCALE }} />
          </div>
        </ChartCard>
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}