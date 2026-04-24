/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import axios from 'axios'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)
ChartJS.defaults.color       = '#7F8699'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)'
ChartJS.defaults.font.family = 'Instrument Sans'

const TOOLTIP = { backgroundColor: '#1A2030', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, titleColor: '#ECEEF5', bodyColor: '#7F8699', padding: 10, cornerRadius: 8, displayColors: false }
const SCALE   = {
  x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 11 } }, border: { color: 'transparent' } },
  y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#3D4460', font: { size: 11 } }, border: { color: 'transparent' } },
}

// ── Helpers ───────────────────────────────────────────────────────
function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? 0 : n }
  return 0
}
function fmtCr(v: number) {
  return v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : `₹${v.toLocaleString('en-IN')}`
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

interface SectionState {
  status: LoadState
  labels: string[]
  values: number[]
  series?: { label: string; data: number[]; color: string }[]
}
interface MetricState {
  status: LoadState
  items: { label: string; value: string; color: string; delta: string; up: boolean }[]
}
interface InsightState {
  status: LoadState
  items: { text: string; type: 'up' | 'warn' | 'info' }[]
}

// ── Stable cache stored OUTSIDE the component ─────────────────────
// This persists across re-renders and tab switches for the lifetime
// of the browser session. Only cleared when user clicks Refresh.
const CACHE: {
  agents:   SectionState | null
  dpd:      SectionState | null
  channel:  SectionState | null
  rollRate: SectionState | null
  metrics:  MetricState  | null
  insights: InsightState | null
  apiUrl:   string | null   // which API this cache belongs to
} = {
  agents: null, dpd: null, channel: null, rollRate: null,
  metrics: null, insights: null, apiUrl: null,
}

function clearCache() {
  CACHE.agents = CACHE.dpd = CACHE.channel = CACHE.rollRate =
  CACHE.metrics = CACHE.insights = CACHE.apiUrl = null
}

// ── API helper ────────────────────────────────────────────────────
async function callAPI(apiUrl: string, query: string) {
  const { data } = await axios.post(
    `${apiUrl}/query`,
    { query, language: 'en' },
    { timeout: 25000, headers: { 'Content-Type': 'application/json' } }
  )
  return data
}

function getChartData(d: Record<string, unknown>): Record<string, unknown>[] {
  return ((d.chart as Record<string, unknown>)?.data as Record<string, unknown>[]) || []
}

function getXY(rows: Record<string, unknown>[]) {
  if (!rows.length) return { labels: [], values: [] }
  const allKeys   = Object.keys(rows[0])
  const labelCol  = allKeys.find(k => typeof rows[0][k] === 'string') || allKeys[0]
  const valueCol  = allKeys.find(k => k !== labelCol && (typeof rows[0][k] === 'number' || !isNaN(parseFloat(rows[0][k] as string)))) || allKeys[1]
  return {
    labels: rows.map(r => String(r[labelCol] ?? '')),
    values: rows.map(r => toNum(r[valueCol])),
  }
}

const METRIC_COLORS = ['var(--accent-2)', 'var(--green)', 'var(--amber)', '#74B9FF', 'var(--red)', 'var(--accent-3)']
const METRIC_META: Record<string, { label: string; up: boolean; fmt: (v: number) => string }> = {
  total_outstanding_amount: { label: 'Total Outstanding', up: false, fmt: fmtCr },
  total_outstanding:        { label: 'Total Outstanding', up: false, fmt: fmtCr },
  recovery_rate:            { label: 'Recovery Rate',     up: true,  fmt: v => `${v.toFixed(1)}%` },
  recovery_rate_pct:        { label: 'Recovery Rate',     up: true,  fmt: v => `${v.toFixed(1)}%` },
  active_accounts:          { label: 'Active Accounts',   up: false, fmt: v => v.toLocaleString('en-IN') },
  account_count:            { label: 'Active Accounts',   up: false, fmt: v => v.toLocaleString('en-IN') },
  avg_dpd:                  { label: 'Avg DPD',           up: false, fmt: v => `${v.toFixed(0)} days` },
  average_dpd:              { label: 'Avg DPD',           up: false, fmt: v => `${v.toFixed(0)} days` },
  ptp_fulfillment:          { label: 'PTP Fulfillment',   up: true,  fmt: v => `${v.toFixed(1)}%` },
  ptp_fulfillment_rate:     { label: 'PTP Fulfillment',   up: true,  fmt: v => `${v.toFixed(1)}%` },
  active_agents:            { label: 'Active Agents',     up: true,  fmt: v => String(Math.round(v)) },
  agent_count:              { label: 'Active Agents',     up: true,  fmt: v => String(Math.round(v)) },
}

// ── Sub-components ────────────────────────────────────────────────
function SkeletonCard({ height = 220 }: { height?: number }) {
  return (
    <div style={{ borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '18px 18px 14px', height: height + 54, overflow: 'hidden' }}>
      <div style={{ height: 13, width: '40%', background: 'var(--bg-4)', borderRadius: 6, marginBottom: 8 }} />
      <div style={{ height: 10, width: '60%', background: 'var(--bg-3)', borderRadius: 6, marginBottom: 16 }} />
      <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}
        style={{ height, borderRadius: 8, background: 'var(--bg-3)' }} />
    </div>
  )
}

function LoadingRow({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>Loading {label}…</span>
    </motion.div>
  )
}

function ChartCard({ title, subtitle, status, delay = 0, children }: {
  title: string; subtitle: string; status: LoadState; delay?: number; children: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: 'var(--bg-2)', border: `1px solid ${status === 'loading' ? 'rgba(108,92,231,0.2)' : 'var(--border)'}`, borderRadius: 14, padding: '18px 18px 14px', transition: 'border-color 0.3s' }}>
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2, fontFamily: 'var(--font-body)' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>{subtitle}</div>
        </div>
        {status === 'loading' && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', flexShrink: 0 }} />
        )}
        {status === 'done' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: 11, color: 'var(--green)' }}>✓</motion.span>
        )}
      </div>
      {children}
    </motion.div>
  )
}

function EmptyChart() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
      No data available
    </div>
  )
}

const insightBg     = { up: 'rgba(0,184,148,0.1)', warn: 'rgba(253,203,110,0.1)', info: 'rgba(116,185,255,0.1)' }
const insightBorder = { up: 'rgba(0,184,148,0.22)', warn: 'rgba(253,203,110,0.2)', info: 'rgba(116,185,255,0.18)' }
const insightColor  = { up: 'var(--green)', warn: 'var(--amber)', info: '#74B9FF' }
const insightIcon   = { up: '↗', warn: '⚠', info: '→' }

// ── Main component ────────────────────────────────────────────────
interface Props { isMobile?: boolean; apiUrl: string; sessionId: string | null }

export default function AnalyticsPage({ isMobile = false, apiUrl }: Props) {
  // NOTE: sessionId is intentionally NOT used for analytics queries.
  // Analytics always runs fresh independent queries so they don't pollute
  // the user's chat session context.

  const chartH = isMobile ? 170 : 200

  // Initialise from cache if available for this apiUrl
  const fromCache = CACHE.apiUrl === apiUrl

  const [agents,   setAgents]   = useState<SectionState>(fromCache && CACHE.agents   ? CACHE.agents   : { status: 'idle', labels: [], values: [] })
  const [dpd,      setDpd]      = useState<SectionState>(fromCache && CACHE.dpd      ? CACHE.dpd      : { status: 'idle', labels: [], values: [] })
  const [channel,  setChannel]  = useState<SectionState>(fromCache && CACHE.channel  ? CACHE.channel  : { status: 'idle', labels: [], values: [] })
  const [rollRate, setRollRate] = useState<SectionState>(fromCache && CACHE.rollRate ? CACHE.rollRate : { status: 'idle', labels: [], values: [], series: [] })
  const [metrics,  setMetrics]  = useState<MetricState> (fromCache && CACHE.metrics  ? CACHE.metrics  : { status: 'idle', items: [] })
  const [insights, setInsights] = useState<InsightState>(fromCache && CACHE.insights ? CACHE.insights : { status: 'idle', items: [] })

  // Guard: only fire load once per mount when cache is absent
  const hasFetched = useRef(fromCache)

  // ── Sequential loader ─────────────────────────────────────────

  const loadAll = async (force = false) => {
    if (!force && hasFetched.current) return
    hasFetched.current = true
    clearCache()
    CACHE.apiUrl = apiUrl

    const idle: SectionState = { status: 'loading', labels: [], values: [] }
    setAgents({ ...idle })
    setDpd({ ...idle })
    setChannel({ ...idle })
    setRollRate({ ...idle, series: [] })
    setMetrics({ status: 'loading', items: [] })
    setInsights({ status: 'loading', items: [] })

    try {
      const { data } = await axios.get(`${apiUrl}/dashboard`, { timeout: 30000 })

      // Agents
      const agentRows = data.agents?.rows || []
      const agentData: SectionState = {
        status: 'done',
        labels: agentRows.map((r: Record<string, unknown>) => String(r.agent_name ?? '')),
        values: agentRows.map((r: Record<string, unknown>) => toNum(r.recovery_rate_pct)),
      }
      setAgents(agentData)
      CACHE.agents = agentData

      // DPD buckets
      const dpdRows = data.dpd_buckets?.rows || []
      const dpdData: SectionState = {
        status: 'done',
        labels: dpdRows.map((r: Record<string, unknown>) => String(r.dpd_bucket ?? '')),
        values: dpdRows.map((r: Record<string, unknown>) => toNum(r.account_count)),
      }
      setDpd(dpdData)
      CACHE.dpd = dpdData

      // Channel — use product recovery
      const channelRows = data.product_recovery?.rows || []
      const channelData: SectionState = {
        status: 'done',
        labels: channelRows.map((r: Record<string, unknown>) => String(r.product_name ?? '')),
        values: channelRows.map((r: Record<string, unknown>) => toNum(r.recovery_rate_pct)),
      }
      setChannel(channelData)
      CACHE.channel = channelData

      // Roll rate — use payment trends as line chart
      const trendRows = data.payment_trends?.rows || []
      const COLORS = ['#6C5CE7', '#FDCB6E', '#E17055']
      const rollData: SectionState = {
        status: 'done',
        labels: trendRows.map((r: Record<string, unknown>) => String(r.month ?? '')),
        values: [],
        series: [
          {
            label: 'Total Collected',
            data: trendRows.map((r: Record<string, unknown>) => toNum(r.total_collected)),
            color: COLORS[0],
          },
          {
            label: 'Recovery Rate %',
            data: trendRows.map((r: Record<string, unknown>) => toNum(r.recovery_rate_pct)),
            color: COLORS[1],
          },
        ],
      }
      setRollRate(rollData)
      CACHE.rollRate = rollData

      // Metrics
      const m = data.metrics?.rows?.[0] || {}
      const metricsData: MetricState = {
        status: 'done',
        items: [
          { label: 'Total Outstanding', value: fmtCr(toNum(m.total_outstanding_amount)), color: METRIC_COLORS[0], delta: 'live', up: false },
          { label: 'Avg DPD',           value: `${toNum(m.avg_dpd).toFixed(0)} days`,    color: METRIC_COLORS[1], delta: 'live', up: false },
          { label: 'Active Accounts',   value: toNum(m.active_accounts).toLocaleString('en-IN'), color: METRIC_COLORS[2], delta: 'live', up: true },
          { label: 'NPA Accounts',      value: toNum(m.npa_accounts).toLocaleString('en-IN'),    color: METRIC_COLORS[3], delta: 'live', up: false },
          { label: 'NPA Rate',          value: `${toNum(m.npa_rate_pct).toFixed(1)}%`,           color: METRIC_COLORS[4], delta: 'live', up: false },
          { label: 'Lenders',           value: String(toNum(m.total_lenders)),                    color: METRIC_COLORS[5], delta: 'live', up: true },
        ],
      }
      setMetrics(metricsData)
      CACHE.metrics = metricsData

      // Insights
      const insightItems: InsightState['items'] = []
      if (agentData.labels.length > 0)
        insightItems.push({ text: `${agentData.labels[0]} leads recovery at ${agentData.values[0]?.toFixed(1)}%`, type: 'up' })
      if (dpdData.labels.length > 0) {
        const maxIdx = dpdData.values.indexOf(Math.max(...dpdData.values))
        insightItems.push({ text: `Highest DPD concentration: ${dpdData.labels[maxIdx]} with ${dpdData.values[maxIdx].toLocaleString('en-IN')} accounts`, type: 'info' })
      }
      if (trendRows.length > 0) {
        const latest = trendRows[trendRows.length - 1]
        insightItems.push({ text: `Latest month recovery: ${fmtCr(toNum(latest.total_collected))} at ${toNum(latest.recovery_rate_pct).toFixed(1)}%`, type: 'up' })
      }
      if (toNum(m.npa_rate_pct) > 20)
        insightItems.push({ text: `NPA rate at ${toNum(m.npa_rate_pct).toFixed(1)}% — monitor high DPD accounts`, type: 'warn' })

      const insightsResult: InsightState = { status: 'done', items: insightItems }
      setInsights(insightsResult)
      CACHE.insights = insightsResult

    } catch (e) {
      setAgents({ status: 'error', labels: [], values: [] })
      setDpd({ status: 'error', labels: [], values: [] })
      setChannel({ status: 'error', labels: [], values: [] })
      setRollRate({ status: 'error', labels: [], values: [], series: [] })
      setMetrics({ status: 'error', items: [] })
      setInsights({ status: 'error', items: [] })
    }
  }
  // Only run on first mount if cache is empty
  useEffect(() => {
    if (!hasFetched.current) {
      loadAll()
    }
  }, []) // ← empty deps: never re-runs automatically

  const anySectionLoading = [metrics, agents, dpd, channel, rollRate].some(s => s.status === 'loading')
  const pad = isMobile ? '14px' : '22px 28px'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: pad }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 24 : 30, letterSpacing: '0.08em', color: 'var(--text-1)', marginBottom: 4 }}>PORTFOLIO ANALYTICS</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
            {fromCache ? 'Cached data · CreditNirvana Oracle DB' : 'Live data · CreditNirvana Oracle DB'}
          </p>
        </div>
        <button
          onClick={() => loadAll(true)}
          disabled={anySectionLoading}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', cursor: anySectionLoading ? 'default' : 'pointer', fontSize: 12, color: anySectionLoading ? 'var(--text-3)' : 'var(--text-2)', fontFamily: 'var(--font-body)', flexShrink: 0, opacity: anySectionLoading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          ↺ Refresh
        </button>
      </motion.div>

      {/* Loading status row */}
      <AnimatePresence>
        {anySectionLoading && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {metrics.status  === 'loading' && <LoadingRow label="summary metrics" />}
            {agents.status   === 'loading' && <LoadingRow label="agent performance" />}
            {dpd.status      === 'loading' && <LoadingRow label="DPD buckets" />}
            {channel.status  === 'loading' && <LoadingRow label="channel recovery" />}
            {rollRate.status === 'loading' && <LoadingRow label="roll rate trends" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights */}
      <AnimatePresence>
        {insights.status === 'done' && insights.items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
            {insights.items.map((ins, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 10, background: insightBg[ins.type], border: `1px solid ${insightBorder[ins.type]}` }}>
                <span style={{ fontSize: 14, color: insightColor[ins.type], flexShrink: 0, fontWeight: 600 }}>{insightIcon[ins.type]}</span>
                <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, fontFamily: 'var(--font-body)' }}>{ins.text}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric cards */}
      <div style={{ marginBottom: 20 }}>
        {metrics.status === 'loading' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(6,1fr)', gap: 12 }}>
            {Array(6).fill(0).map((_, i) => (
              <motion.div key={i} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 1.4, delay: i * 0.1, repeat: Infinity }}
                style={{ height: 90, borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        )}
        {metrics.status === 'done' && metrics.items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(6,1fr)', gap: 12 }}>
            {metrics.items.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{m.label.toUpperCase()}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: m.color, lineHeight: 1, marginBottom: 8 }}>{m.value}</div>
                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: m.up ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-body)' }}>
                  <span>{m.up ? '▲' : '▼'}</span><span>{m.delta}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        {metrics.status === 'error' && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--red-bg)', border: '1px solid rgba(225,112,85,0.3)', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
            ⚠ Could not load metrics — click Refresh to retry
          </div>
        )}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 16, marginBottom: 16 }}>

        {agents.status === 'loading' ? <SkeletonCard height={chartH} /> : (
          <ChartCard title="Agent Recovery Rate" subtitle="Top agents · this period" delay={0.1} status={agents.status}>
            <div style={{ height: chartH }}>
              {agents.labels.length > 0 ? (
                <Bar
                  data={{ labels: agents.labels, datasets: [{ data: agents.values, backgroundColor: agents.values.map((_, i) => `rgba(108,92,231,${Math.max(0.2, 0.9 - i * 0.08).toFixed(2)})`), borderColor: 'transparent', borderRadius: 5, borderSkipped: false }] }}
                  options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false }, tooltip: TOOLTIP }, scales: SCALE }}
                />
              ) : <EmptyChart />}
            </div>
          </ChartCard>
        )}

        {channel.status === 'loading' ? <SkeletonCard height={chartH} /> : (
          <ChartCard title="Recovery by Channel" subtitle="Amount recovered · this period" delay={0.15} status={channel.status}>
            <div style={{ height: chartH }}>
              {channel.labels.length > 0 ? (
                <Doughnut
                  data={{ labels: channel.labels, datasets: [{ data: channel.values, backgroundColor: ['rgba(108,92,231,0.85)','rgba(0,184,148,0.85)','rgba(253,203,110,0.85)','rgba(116,185,255,0.85)','rgba(225,112,85,0.75)'], borderColor: 'var(--bg-1)', borderWidth: 2, hoverOffset: 5 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: '#7F8699', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 } }, tooltip: TOOLTIP } }}
                />
              ) : <EmptyChart />}
            </div>
          </ChartCard>
        )}
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {rollRate.status === 'loading' ? <SkeletonCard height={chartH} /> : (
          <ChartCard title="Roll Rate Trend" subtitle="% accounts moving to worse DPD bucket" delay={0.2} status={rollRate.status}>
            <div style={{ height: chartH }}>
              {rollRate.series && rollRate.series.length > 0 ? (
                <Line
                  data={{ labels: rollRate.labels, datasets: rollRate.series.map((s, i) => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.color.replace(')', ',0.06)').replace('rgb', 'rgba'), borderWidth: 2, pointBackgroundColor: s.color, pointRadius: 4, fill: i === 0, tension: 0.4 })) }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' as const, labels: { color: '#7F8699', boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 16 } }, tooltip: TOOLTIP }, scales: SCALE }}
                />
              ) : <EmptyChart />}
            </div>
          </ChartCard>
        )}

        {dpd.status === 'loading' ? <SkeletonCard height={chartH} /> : (
          <ChartCard title="DPD Bucket Distribution" subtitle="Account count by days past due" delay={0.25} status={dpd.status}>
            <div style={{ height: chartH }}>
              {dpd.labels.length > 0 ? (
                <Bar
                  data={{ labels: dpd.labels, datasets: [{ data: dpd.values, backgroundColor: ['rgba(0,184,148,0.8)','rgba(108,92,231,0.8)','rgba(253,203,110,0.8)','rgba(225,112,85,0.7)','rgba(225,112,85,0.4)'], borderColor: 'transparent', borderRadius: 6, borderSkipped: false }] }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: TOOLTIP }, scales: SCALE }}
                />
              ) : <EmptyChart />}
            </div>
          </ChartCard>
        )}
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
