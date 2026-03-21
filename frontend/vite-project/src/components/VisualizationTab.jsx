import { useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import Tip from './Tip'

function fmt(v) {
  return typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: '#131a27', border: '1px solid #1e2d3d', borderRadius: 6, padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>
      <div>Generation {d.generation}</div>
      <div style={{ color: '#38bdf8' }}>Best: {fmt(d.best_fitness)}</div>
      <div style={{ color: '#34d399' }}>Avg: {fmt(d.avg_fitness)}</div>
      <div style={{ color: '#f87171' }}>Worst: {fmt(d.worst_fitness)}</div>
      <div style={{ color: '#94a3b8' }}>Elapsed: {fmt(d.elapsed_seconds)}s</div>
    </div>
  )
}

export default function VisualizationTab({ history, isRunning }) {
  const [showBest, setShowBest] = useState(true)
  const [showAvg, setShowAvg] = useState(true)
  const [showWorst, setShowWorst] = useState(false)
  const [plotEvery, setPlotEvery] = useState(1)

  if (!history.length && !isRunning) {
    return (
      <div className="empty-state">
        <h3>No data yet</h3>
        <p>Configure GA parameters in the sidebar and click &quot;Run GA&quot; to start optimizing. The convergence chart will appear here in real time.</p>
      </div>
    )
  }

  const n = Math.max(1, Math.min(50, plotEvery))
  const filtered = history.filter((_, i) => i % n === 0 || i === history.length - 1)
  const latest = history[history.length - 1]
  const bd = latest?.breakdown

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Generation</div><div className="stat-value">{latest?.generation || 0} / {latest?.total || '—'}</div></div>
        <div className="stat-card"><div className="stat-label">Best fitness</div><div className="stat-value">{fmt(latest?.best_fitness)}</div></div>
        <div className="stat-card"><div className="stat-label">Avg fitness</div><div className="stat-value">{fmt(latest?.avg_fitness)}</div></div>
        <div className="stat-card"><div className="stat-label">Elapsed</div><div className="stat-value">{fmt(latest?.elapsed_seconds)}s</div></div>
      </div>

      <div className="chart-controls">
        <label><input type="checkbox" checked={showBest} onChange={e => setShowBest(e.target.checked)} /> Best fitness</label>
        <label><input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} /> Avg fitness</label>
        <label><input type="checkbox" checked={showWorst} onChange={e => setShowWorst(e.target.checked)} /> Worst fitness</label>
        <label>
          <Tip text="Reduces chart density. N=5 plots one point per 5 generations. Useful for long runs." />
          Plot every
          <input type="number" min={1} max={50} value={plotEvery} onChange={e => setPlotEvery(+e.target.value || 1)} />
          gens
        </label>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={filtered} margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
          <XAxis dataKey="generation" label={{ value: 'Generation', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} stroke="#1e2d3d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tickFormatter={v => v.toLocaleString()} label={{ value: 'Fitness', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} stroke="#1e2d3d" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <RTooltip content={<CustomTooltip />} />
          <Legend />
          {showBest && <Line type="monotone" dataKey="best_fitness" name="Best" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />}
          {showAvg && <Line type="monotone" dataKey="avg_fitness" name="Avg" stroke="#34d399" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />}
          {showWorst && <Line type="monotone" dataKey="worst_fitness" name="Worst" stroke="#f87171" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>

      {bd && (
        <div>
          <h3 className="section-title" style={{ marginTop: 24 }}>Fitness breakdown — latest generation</h3>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <div className="bd-label"><Tip text="Sum of tonnes × cost_per_tonne across all routes." /> Transport cost</div>
              <div className="bd-value" style={{ color: '#38bdf8' }}>₹{fmt(bd.transport_cost)}</div>
            </div>
            <div className="breakdown-item">
              <div className="bd-label"><Tip text="One-time trip cost charged for each route carrying > 1 tonne." /> Fixed cost</div>
              <div className="bd-value" style={{ color: '#fbbf24' }}>₹{fmt(bd.fixed_cost)}</div>
            </div>
            <div className="breakdown-item">
              <div className="bd-label"><Tip text="Penalty for production units exceeding their capacity." /> Supply violation</div>
              <div className="bd-value" style={{ color: '#f87171' }}>₹{fmt(bd.supply_violation)}</div>
            </div>
            <div className="breakdown-item">
              <div className="bd-label"><Tip text="Penalty for grinding units not receiving enough clinker." /> Demand violation</div>
              <div className="bd-value" style={{ color: '#fb923c' }}>₹{fmt(bd.demand_violation)}</div>
            </div>
            <div className="breakdown-item">
              <div className="bd-label"><Tip text="Penalty for routes exceeding their max transport capacity." /> Cap violation</div>
              <div className="bd-value" style={{ color: '#f472b6' }}>₹{fmt(bd.cap_violation)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
