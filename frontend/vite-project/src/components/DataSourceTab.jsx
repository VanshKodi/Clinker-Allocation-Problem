import { useState, useEffect } from 'react'
import { api } from '../api'
import NetworkGraph from './NetworkGraph'

function EditableCell({ value, onSave, type }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')

  useEffect(() => { setVal(value ?? '') }, [value])

  if (!editing) {
    return <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', minWidth: 40, display: 'inline-block' }}>{value ?? '—'}</span>
  }
  return (
    <input
      className="inline-input"
      type={type === 'number' ? 'number' : 'text'}
      value={val}
      autoFocus
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(type === 'number' ? parseFloat(val) || 0 : val) }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(type === 'number' ? parseFloat(val) || 0 : val) } }}
    />
  )
}

function ProdUnitsTable({ preset, showToast }) {
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', city: '', capacity: 0, description: '' })

  const load = () => api.getProdUnits(preset).then(setRows).catch(() => showToast('Failed to load', 'error'))
  useEffect(() => { if (preset) load() }, [preset])

  const patch = async (id, field, val) => {
    await api.updateProdUnit(id, { [field]: val })
    showToast('Updated', 'success')
    load()
  }
  const del = async (id) => {
    await api.deleteProdUnit(id)
    showToast('Deleted', 'info')
    load()
  }
  const add = async () => {
    await api.createProdUnit({ ...newRow, preset })
    showToast('Created', 'success')
    setAdding(false)
    setNewRow({ name: '', city: '', capacity: 0, description: '' })
    load()
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>City</th><th>Capacity</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><EditableCell value={r.name} onSave={v => patch(r.id, 'name', v)} /></td>
                <td><EditableCell value={r.city} onSave={v => patch(r.id, 'city', v)} /></td>
                <td><EditableCell value={r.capacity} onSave={v => patch(r.id, 'capacity', v)} type="number" /></td>
                <td><EditableCell value={r.description} onSave={v => patch(r.id, 'description', v)} /></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button></td>
              </tr>
            ))}
            {adding && (
              <tr>
                <td><input className="inline-input" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} /></td>
                <td><input className="inline-input" value={newRow.city} onChange={e => setNewRow(p => ({ ...p, city: e.target.value }))} /></td>
                <td><input className="inline-input" type="number" value={newRow.capacity} onChange={e => setNewRow(p => ({ ...p, capacity: +e.target.value }))} /></td>
                <td><input className="inline-input" value={newRow.description} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} /></td>
                <td>
                  <button className="btn btn-success btn-sm" onClick={add}>Save</button>{' '}
                  <button className="btn btn-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} onClick={() => setAdding(false)}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!adding && <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>+ Add row</button>}
    </div>
  )
}

function GrindUnitsTable({ preset, showToast }) {
  const [rows, setRows] = useState([])
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', city: '', demand: 0, description: '' })

  const load = () => api.getGrindUnits(preset).then(setRows).catch(() => showToast('Failed to load', 'error'))
  useEffect(() => { if (preset) load() }, [preset])

  const patch = async (id, field, val) => { await api.updateGrindUnit(id, { [field]: val }); showToast('Updated', 'success'); load() }
  const del = async (id) => { await api.deleteGrindUnit(id); showToast('Deleted', 'info'); load() }
  const add = async () => { await api.createGrindUnit({ ...newRow, preset }); showToast('Created', 'success'); setAdding(false); setNewRow({ name: '', city: '', demand: 0, description: '' }); load() }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>City</th><th>Demand</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><EditableCell value={r.name} onSave={v => patch(r.id, 'name', v)} /></td>
                <td><EditableCell value={r.city} onSave={v => patch(r.id, 'city', v)} /></td>
                <td><EditableCell value={r.demand} onSave={v => patch(r.id, 'demand', v)} type="number" /></td>
                <td><EditableCell value={r.description} onSave={v => patch(r.id, 'description', v)} /></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button></td>
              </tr>
            ))}
            {adding && (
              <tr>
                <td><input className="inline-input" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} /></td>
                <td><input className="inline-input" value={newRow.city} onChange={e => setNewRow(p => ({ ...p, city: e.target.value }))} /></td>
                <td><input className="inline-input" type="number" value={newRow.demand} onChange={e => setNewRow(p => ({ ...p, demand: +e.target.value }))} /></td>
                <td><input className="inline-input" value={newRow.description} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} /></td>
                <td>
                  <button className="btn btn-success btn-sm" onClick={add}>Save</button>{' '}
                  <button className="btn btn-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} onClick={() => setAdding(false)}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!adding && <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>+ Add row</button>}
    </div>
  )
}

function RoutesTable({ preset, showToast }) {
  const [rows, setRows] = useState([])
  const [pus, setPus] = useState([])
  const [gus, setGus] = useState([])
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', pu_id: '', gu_id: '', cost_per_tonne: 0, fixed_trip_cost: 0, max_capacity: null, description: '' })

  const load = () => {
    api.getRoutes(preset).then(setRows).catch(() => showToast('Failed to load', 'error'))
    api.getProdUnits(preset).then(setPus).catch(() => {})
    api.getGrindUnits(preset).then(setGus).catch(() => {})
  }
  useEffect(() => { if (preset) load() }, [preset])

  const puName = (id) => pus.find(p => p.id === id)?.name || id
  const guName = (id) => gus.find(g => g.id === id)?.name || id

  const patch = async (id, field, val) => { await api.updateRoute(id, { [field]: val }); showToast('Updated', 'success'); load() }
  const del = async (id) => { await api.deleteRoute(id); showToast('Deleted', 'info'); load() }
  const add = async () => { await api.createRoute({ ...newRow, preset }); showToast('Created', 'success'); setAdding(false); setNewRow({ name: '', pu_id: '', gu_id: '', cost_per_tonne: 0, fixed_trip_cost: 0, max_capacity: null, description: '' }); load() }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>From</th><th>To</th><th>Cost/t</th><th>Fixed</th><th>Max cap</th><th>Desc</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><EditableCell value={r.name} onSave={v => patch(r.id, 'name', v)} /></td>
                <td>
                  <select className="inline-input" value={r.pu_id} onChange={e => patch(r.id, 'pu_id', e.target.value)} style={{ minWidth: 100 }}>
                    {pus.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="inline-input" value={r.gu_id} onChange={e => patch(r.id, 'gu_id', e.target.value)} style={{ minWidth: 100 }}>
                    {gus.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td><EditableCell value={r.cost_per_tonne} onSave={v => patch(r.id, 'cost_per_tonne', v)} type="number" /></td>
                <td><EditableCell value={r.fixed_trip_cost} onSave={v => patch(r.id, 'fixed_trip_cost', v)} type="number" /></td>
                <td><EditableCell value={r.max_capacity} onSave={v => patch(r.id, 'max_capacity', v)} type="number" /></td>
                <td><EditableCell value={r.description} onSave={v => patch(r.id, 'description', v)} /></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>Delete</button></td>
              </tr>
            ))}
            {adding && (
              <tr>
                <td><input className="inline-input" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} /></td>
                <td>
                  <select className="inline-input" value={newRow.pu_id} onChange={e => setNewRow(p => ({ ...p, pu_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {pus.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </td>
                <td>
                  <select className="inline-input" value={newRow.gu_id} onChange={e => setNewRow(p => ({ ...p, gu_id: e.target.value }))}>
                    <option value="">Select…</option>
                    {gus.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td><input className="inline-input" type="number" value={newRow.cost_per_tonne} onChange={e => setNewRow(p => ({ ...p, cost_per_tonne: +e.target.value }))} /></td>
                <td><input className="inline-input" type="number" value={newRow.fixed_trip_cost} onChange={e => setNewRow(p => ({ ...p, fixed_trip_cost: +e.target.value }))} /></td>
                <td><input className="inline-input" type="number" value={newRow.max_capacity || ''} onChange={e => setNewRow(p => ({ ...p, max_capacity: +e.target.value || null }))} /></td>
                <td><input className="inline-input" value={newRow.description} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} /></td>
                <td>
                  <button className="btn btn-success btn-sm" onClick={add}>Save</button>{' '}
                  <button className="btn btn-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }} onClick={() => setAdding(false)}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!adding && <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>+ Add row</button>}
    </div>
  )
}

export default function DataSourceTab({ showToast }) {
  const [subTab, setSubTab] = useState('prod')
  const [presets, setPresets] = useState([])
  const [preset, setPreset] = useState('')
  const [prodUnits, setProdUnits] = useState([])
  const [grindUnits, setGrindUnits] = useState([])
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    api.getPresets().then(list => { setPresets(list); if (list.length) setPreset(list[0].name) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!preset) return
    api.getProdUnits(preset).then(setProdUnits).catch(() => {})
    api.getGrindUnits(preset).then(setGrindUnits).catch(() => {})
    api.getRoutes(preset).then(setRoutes).catch(() => {})
  }, [preset])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Preset filter</label>
        <select value={preset} onChange={e => setPreset(e.target.value)} style={{ padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6 }}>
          {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <div className="sub-tabs">
        {[['prod', 'Production Units'], ['grind', 'Grinding Units'], ['routes', 'Routes'], ['graph', 'Network Graph']].map(([key, label]) => (
          <button key={key} className={subTab === key ? 'active' : ''} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>

      {subTab === 'prod' && <ProdUnitsTable preset={preset} showToast={showToast} />}
      {subTab === 'grind' && <GrindUnitsTable preset={preset} showToast={showToast} />}
      {subTab === 'routes' && <RoutesTable preset={preset} showToast={showToast} />}
      {subTab === 'graph' && <NetworkGraph prodUnits={prodUnits} grindUnits={grindUnits} routes={routes} />}
    </div>
  )
}
