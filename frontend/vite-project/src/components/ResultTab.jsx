import { useState, useEffect } from 'react'
import { api } from '../api'
import Tip from './Tip'

function fmt(v) {
  return typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : (v ?? '—')
}

function mapsLink(name, city) {
  const q = `${name} ${city}`.replace(/\s+/g, '+')
  return `https://www.google.com/maps/search/${q}`
}

export default function ResultTab({ currentResult, gaParams, onSave, showToast }) {
  const [pastRuns, setPastRuns] = useState([])
  const [selectedId, setSelectedId] = useState('current')
  const [fetchedResult, setFetchedResult] = useState(null)
  const [saved, setSaved] = useState(false)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    api.getResults().then(setPastRuns).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedId !== 'current') {
      api.getResult(selectedId).then(setFetchedResult).catch(() => showToast('Failed to load result', 'error'))
    }
  }, [selectedId, showToast])

  const viewResult = selectedId === 'current' ? currentResult : fetchedResult

  const handleSave = async () => {
    try {
      await onSave()
      setSaved(true)
      showToast('Result saved!', 'success')
      api.getResults().then(setPastRuns).catch(() => {})
    } catch {
      showToast('Failed to save', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteResult(id)
      showToast('Deleted', 'info')
      setPastRuns(prev => prev.filter(r => r.id !== id))
      if (selectedId === id) setSelectedId('current')
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const result = viewResult
  const allocs = result?.allocations?.filter(a => a.tonnes > 1.0) || []

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = [...allocs].sort((a, b) => {
    if (!sortCol) return 0
    const va = a[sortCol], vb = b[sortCol]
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totals = sorted.reduce((acc, a) => ({
    tonnes: acc.tonnes + (a.tonnes || 0),
    variable_cost: acc.variable_cost + (a.variable_cost || 0),
    fixed_cost: acc.fixed_cost + (a.fixed_cost || 0),
    total_cost: acc.total_cost + (a.total_cost || 0),
  }), { tonnes: 0, variable_cost: 0, fixed_cost: 0, total_cost: 0 })

  const arrow = (col) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, minWidth: 280 }}>
          {currentResult && <option value="current">Current run</option>}
          {pastRuns.map(r => (
            <option key={r.id} value={r.id}>
              {r.run_at?.slice(0, 19)} | {r.preset} | ₹{fmt(r.total_cost)}
            </option>
          ))}
        </select>

        {selectedId === 'current' && currentResult && (
          <button className="btn btn-success" onClick={handleSave} disabled={saved}>
            {saved ? 'Saved ✓' : 'Save result'}
          </button>
        )}
        {selectedId !== 'current' && (
          <button className="btn btn-danger" onClick={() => handleDelete(selectedId)}>Delete</button>
        )}
      </div>

      {!result ? (
        <div className="empty-state">
          <h3>No result available</h3>
          <p>Run the GA or select a past run from the dropdown above.</p>
        </div>
      ) : (
        <>
          <div className="kpi-row">
            <div className="kpi-card"><div className="kpi-label">Total cost</div><div className="kpi-value">₹{fmt(result.total_cost)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Best fitness</div><div className="kpi-value">{fmt(result.best_fitness)}</div></div>
            <div className="kpi-card"><div className="kpi-label">Preset</div><div className="kpi-value" style={{ fontSize: 16 }}>{result.preset}</div></div>
            <div className="kpi-card"><div className="kpi-label">Elapsed</div><div className="kpi-value">{fmt(result.elapsed_seconds)}s</div></div>
            <div className="kpi-card"><div className="kpi-label">Convergence gen</div><div className="kpi-value">{result.convergence_generation ?? '—'}</div></div>
          </div>

          <div className="collapsible-header" onClick={() => setCollapsed(!collapsed)}>
            <span className={`collapsible-arrow ${collapsed ? '' : 'open'}`}>▶</span>
            GA params used
          </div>
          {!collapsed && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 20, padding: '8px 0' }}>
              {Object.entries(gaParams).map(([k, v]) => (
                <div key={k} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </div>
              ))}
            </div>
          )}

          <h3 className="section-title">Allocations</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('route_name')}>Route{arrow('route_name')}</th>
                  <th onClick={() => toggleSort('pu_name')}>From{arrow('pu_name')}</th>
                  <th onClick={() => toggleSort('gu_name')}>To{arrow('gu_name')}</th>
                  <th onClick={() => toggleSort('tonnes')}>Tonnes{arrow('tonnes')}</th>
                  <th onClick={() => toggleSort('variable_cost')}>Var. cost{arrow('variable_cost')}</th>
                  <th onClick={() => toggleSort('fixed_cost')}>Fixed cost{arrow('fixed_cost')}</th>
                  <th onClick={() => toggleSort('total_cost')}>Total cost{arrow('total_cost')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <span className="tooltip-wrap">
                        {a.route_name}
                        {a.route_name && <span className="tooltip-text">{a.route_name}</span>}
                      </span>
                    </td>
                    <td>
                      <span className="tooltip-wrap">
                        <a href={mapsLink(a.pu_name, a.pu_city)} target="_blank" rel="noopener noreferrer">{a.pu_name}</a>
                        <span className="tooltip-text">{a.pu_city}</span>
                      </span>
                    </td>
                    <td>
                      <span className="tooltip-wrap">
                        <a href={mapsLink(a.gu_name, a.gu_city)} target="_blank" rel="noopener noreferrer">{a.gu_name}</a>
                        <span className="tooltip-text">{a.gu_city}</span>
                      </span>
                    </td>
                    <td>{fmt(a.tonnes)}</td>
                    <td>₹{fmt(a.variable_cost)}</td>
                    <td>₹{fmt(a.fixed_cost)}</td>
                    <td>₹{fmt(a.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="footer-row">
                  <td colSpan={3}>Total</td>
                  <td>{fmt(totals.tonnes)}</td>
                  <td>₹{fmt(totals.variable_cost)}</td>
                  <td>₹{fmt(totals.fixed_cost)}</td>
                  <td>₹{fmt(totals.total_cost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
