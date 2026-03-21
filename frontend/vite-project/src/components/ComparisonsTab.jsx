import { useState, useEffect } from 'react'
import { api } from '../api'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RTooltip, Legend, CartesianGrid,
} from 'recharts'

function fmt(v) {
  return typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : (v ?? '—')
}

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#f472b6', '#2dd4bf']

const METRICS = [
  { key: 'total_cost', label: 'Total cost', prefix: '₹' },
  { key: 'best_fitness', label: 'Best fitness', prefix: '' },
  { key: 'elapsed_seconds', label: 'Elapsed (s)', prefix: '' },
  { key: 'convergence_generation', label: 'Convergence gen', prefix: '' },
]

export default function ComparisonsTab({ currentResult, showToast }) {
  const [pastRuns, setPastRuns] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [results, setResults] = useState({})

  useEffect(() => {
    api.getResults().then(setPastRuns).catch(() => showToast('Failed to load results', 'error'))
  }, [])

  const addResult = async (id) => {
    if (selectedIds.includes(id)) return
    if (id === 'current') {
      if (!currentResult) return
      setSelectedIds(prev => [...prev, 'current'])
      setResults(prev => ({ ...prev, current: currentResult }))
      return
    }
    try {
      const data = await api.getResult(id)
      setSelectedIds(prev => [...prev, id])
      setResults(prev => ({ ...prev, [id]: data }))
    } catch {
      showToast('Failed to load result', 'error')
    }
  }

  const removeResult = (id) => {
    setSelectedIds(prev => prev.filter(i => i !== id))
    setResults(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const selected = selectedIds.map(id => results[id]).filter(Boolean)
  const labels = selectedIds.map(id =>
    id === 'current' ? 'Current run' : `${results[id]?.preset || '?'} @ ${results[id]?.run_at?.slice(0, 19) || id.slice(0, 8)}`
  )

  const bestValues = {}
  METRICS.forEach(m => {
    const vals = selected.map(r => r[m.key]).filter(v => typeof v === 'number')
    if (vals.length) {
      bestValues[m.key] = m.key === 'convergence_generation' ? Math.min(...vals) : Math.min(...vals)
    }
  })

  const chartData = METRICS.filter(m => m.key !== 'convergence_generation').map(m => {
    const entry = { metric: m.label }
    selectedIds.forEach((id, i) => {
      const r = results[id]
      if (r) entry[`run_${i}`] = r[m.key] ?? 0
    })
    return entry
  })

  const allocChartData = (() => {
    const routeMap = {}
    selected.forEach((r, ri) => {
      (r.allocations || []).filter(a => a.tonnes > 1).forEach(a => {
        const key = a.route_name || a.route_id
        if (!routeMap[key]) routeMap[key] = { route: key }
        routeMap[key][`run_${ri}`] = a.tonnes
      })
    })
    return Object.values(routeMap).sort((a, b) => {
      const sumA = selectedIds.reduce((s, _, i) => s + (a[`run_${i}`] || 0), 0)
      const sumB = selectedIds.reduce((s, _, i) => s + (b[`run_${i}`] || 0), 0)
      return sumB - sumA
    }).slice(0, 20)
  })()

  return (
    <div>
      <h3 className="section-title">Compare Results</h3>

      <div className="comparison-selector">
        <div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Add a result to compare</label>
          <select
            value=""
            onChange={e => { if (e.target.value) addResult(e.target.value) }}
            style={{ padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, minWidth: 300 }}
          >
            <option value="">Select a result…</option>
            {currentResult && !selectedIds.includes('current') && (
              <option value="current">Current run — ₹{fmt(currentResult.total_cost)}</option>
            )}
            {pastRuns.filter(r => !selectedIds.includes(r.id)).map(r => (
              <option key={r.id} value={r.id}>
                {r.run_at?.slice(0, 19)} | {r.preset} | ₹{fmt(r.total_cost)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {selectedIds.map((id, i) => (
            <span key={id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', borderRadius: 20, fontSize: 13,
              background: 'var(--bg-tertiary)', border: `2px solid ${COLORS[i % COLORS.length]}`
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
              {labels[i]}
              <button onClick={() => removeResult(id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {selected.length < 2 ? (
        <div className="empty-state">
          <h3>Select at least 2 results</h3>
          <p>Use the dropdown above to add results you want to compare. You can compare the current run with any number of past runs.</p>
        </div>
      ) : (
        <div className="comparison-grid">
          <div className="comparison-card">
            <h4>Key Metrics</h4>
            <div style={{ '--cols': selected.length }}>
              <div className="comparison-metric-row" style={{ gridTemplateColumns: `160px repeat(${selected.length}, minmax(120px, 1fr))` }}>
                <div className="comparison-metric-label" style={{ fontWeight: 600 }}>Metric</div>
                {labels.map((l, i) => (
                  <div key={i} className="comparison-metric-value" style={{ color: COLORS[i % COLORS.length], fontSize: 12 }}>{l}</div>
                ))}
              </div>
              {METRICS.map(m => {
                const vals = selected.map(r => r[m.key])
                return (
                  <div key={m.key} className="comparison-metric-row" style={{ gridTemplateColumns: `160px repeat(${selected.length}, minmax(120px, 1fr))` }}>
                    <div className="comparison-metric-label">{m.label}</div>
                    {vals.map((v, i) => {
                      const isBest = typeof v === 'number' && v === bestValues[m.key]
                      return (
                        <div key={i} className={`comparison-metric-value ${isBest ? 'comparison-best' : ''}`}>
                          {m.prefix}{fmt(v)}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="comparison-card">
            <h4>Cost Comparison</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#1e2d3d" />
                <YAxis tickFormatter={v => v.toLocaleString()} tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="#1e2d3d" />
                <RTooltip contentStyle={{ background: '#131a27', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 12 }} />
                <Legend />
                {selectedIds.map((id, i) => (
                  <Bar key={id} dataKey={`run_${i}`} name={labels[i]} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {allocChartData.length > 0 && (
            <div className="comparison-card">
              <h4>Route Allocation Comparison (top 20 routes)</h4>
              <ResponsiveContainer width="100%" height={Math.max(300, allocChartData.length * 28 + 60)}>
                <BarChart data={allocChartData} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#1e2d3d" />
                  <YAxis type="category" dataKey="route" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#1e2d3d" width={110} />
                  <RTooltip contentStyle={{ background: '#131a27', border: '1px solid #1e2d3d', borderRadius: 6, fontSize: 12 }} />
                  <Legend />
                  {selectedIds.map((id, i) => (
                    <Bar key={id} dataKey={`run_${i}`} name={labels[i]} fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="comparison-card">
            <h4>Allocation Details</h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    {labels.map((l, i) => <th key={i} style={{ color: COLORS[i % COLORS.length] }}>{l} (tonnes)</th>)}
                  </tr>
                </thead>
                <tbody>
                  {allocChartData.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ fontSize: 12 }}>{row.route}</td>
                      {selectedIds.map((_, i) => (
                        <td key={i} style={{ textAlign: 'center' }}>{fmt(row[`run_${i}`] || 0)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
