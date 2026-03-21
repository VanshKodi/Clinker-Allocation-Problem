import { useEffect, useState } from 'react'
import { api } from '../api'
import Tip from './Tip'

const LAMBDA_OPTIONS = [1e4, 1e5, 1e6, 1e7]

export default function Sidebar({ gaParams, setGaParams, onRun, onCancel, isRunning, history }) {
  const [presets, setPresets] = useState([])

  useEffect(() => {
    api.getPresets().then(setPresets).catch(() => {})
  }, [])

  const set = (key, val) => setGaParams(prev => ({ ...prev, [key]: val }))
  const setNested = (group, key, val) =>
    setGaParams(prev => ({ ...prev, [group]: { ...prev[group], [key]: val } }))

  const p = gaParams
  const sel = p.selection || {}
  const cx = p.crossover || {}
  const mut = p.mutation || {}

  const progress = isRunning && p.generations
    ? Math.min(100, Math.round((history.length / p.generations) * 100))
    : 0

  const presetLabel = (pr) =>
    `${pr.name} (${pr.prod_units}×${pr.grind_units}, ${pr.routes} routes)`

  return (
    <aside className="sidebar">
      <div className="field">
        <label><Tip text="Select a scenario. Each preset is a self-contained set of production units, grinding units and routes." /> Preset</label>
        <select value={p.preset || ''} onChange={e => set('preset', e.target.value)}>
          <option value="">Select preset…</option>
          {presets.map(pr => (
            <option key={pr.name} value={pr.name}>{presetLabel(pr)}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label><Tip text="Number of candidate solutions per generation. Larger = better exploration but slower per generation." /> Population size <span className="slider-val">{p.pop_size}</span></label>
        <input type="range" min={20} max={200} step={10} value={p.pop_size} onChange={e => set('pop_size', +e.target.value)} />
      </div>

      <div className="field">
        <label><Tip text="How many evolution cycles to run. More generations = finer convergence but longer runtime." /> Generations <span className="slider-val">{p.generations}</span></label>
        <input type="range" min={50} max={500} step={10} value={p.generations} onChange={e => set('generations', +e.target.value)} />
      </div>

      <div className="field">
        <label><Tip text="Number of best individuals copied unchanged to next generation. Prevents losing the best solution found." /> Elite size <span className="slider-val">{p.elite_size}</span></label>
        <input type="range" min={1} max={20} step={1} value={p.elite_size} onChange={e => set('elite_size', +e.target.value)} />
      </div>

      <div className="field">
        <label><Tip text="Multiplier for constraint violations. Higher = GA strictly respects capacity/demand but may sacrifice cost optimality." /> Penalty λ</label>
        <select value={p.penalty_lambda} onChange={e => set('penalty_lambda', +e.target.value)}>
          {LAMBDA_OPTIONS.map(v => <option key={v} value={v}>10^{Math.log10(v)}</option>)}
        </select>
      </div>

      <div className="field">
        <label><Tip text="Strategy for choosing parents. Tournament is robust, Roulette favors fit individuals probabilistically, Rank is more stable, Uniform is pure random baseline." /> Selection method</label>
        <select value={sel.method || 'tournament'} onChange={e => setNested('selection', 'method', e.target.value)}>
          <option value="tournament">Tournament</option>
          <option value="roulette">Roulette</option>
          <option value="rank">Rank</option>
          <option value="uniform">Uniform</option>
        </select>
      </div>

      {(sel.method || 'tournament') === 'tournament' && (
        <div className="field">
          <label><Tip text="Number of individuals randomly sampled per selection event. Higher = more selection pressure toward best solutions." /> Tournament size <span className="slider-val">{sel.tournament_size || 3}</span></label>
          <input type="range" min={2} max={10} step={1} value={sel.tournament_size || 3} onChange={e => setNested('selection', 'tournament_size', +e.target.value)} />
        </div>
      )}

      <div className="field">
        <label><Tip text="How two parents combine to produce offspring. Uniform mixes genes randomly, Single/Two point swap segments, HUX swaps exactly half differing genes." /> Crossover method</label>
        <select value={cx.method || 'uniform'} onChange={e => setNested('crossover', 'method', e.target.value)}>
          <option value="uniform">Uniform</option>
          <option value="single_point">Single Point</option>
          <option value="two_point">Two Point</option>
          <option value="hux">HUX</option>
        </select>
      </div>

      <div className="field">
        <label><Tip text="Probability that crossover occurs. If skipped, offspring are copies of parents." /> Crossover rate <span className="slider-val">{(cx.rate || 0.8).toFixed(2)}</span></label>
        <input type="range" min={0.1} max={1.0} step={0.05} value={cx.rate || 0.8} onChange={e => setNested('crossover', 'rate', +e.target.value)} />
      </div>

      <div className="field">
        <label><Tip text="How offspring are randomly altered. Gaussian adds noise, Uniform replaces randomly, Swap exchanges two genes, Scramble shuffles a subset." /> Mutation method</label>
        <select value={mut.method || 'gaussian'} onChange={e => setNested('mutation', 'method', e.target.value)}>
          <option value="gaussian">Gaussian</option>
          <option value="uniform">Uniform</option>
          <option value="swap">Swap</option>
          <option value="scramble">Scramble</option>
        </select>
      </div>

      <div className="field">
        <label><Tip text="Probability each gene is mutated. Too low = slow exploration, too high = random walk." /> Mutation rate <span className="slider-val">{(mut.rate || 0.15).toFixed(2)}</span></label>
        <input type="range" min={0.01} max={0.5} step={0.01} value={mut.rate || 0.15} onChange={e => setNested('mutation', 'rate', +e.target.value)} />
      </div>

      {(mut.method || 'gaussian') === 'gaussian' && (
        <div className="field">
          <label><Tip text="Standard deviation of Gaussian noise added to genes. Higher = larger random perturbations." /> Sigma <span className="slider-val">{mut.sigma || 50}</span></label>
          <input type="range" min={10} max={200} step={5} value={mut.sigma || 50} onChange={e => setNested('mutation', 'sigma', +e.target.value)} />
        </div>
      )}

      {(mut.method) === 'uniform' && (
        <div className="field">
          <label><Tip text="Maximum value a gene can be randomly set to during mutation." /> Range <span className="slider-val">{mut.range || 100}</span></label>
          <input type="range" min={10} max={500} step={10} value={mut.range || 100} onChange={e => setNested('mutation', 'range', +e.target.value)} />
        </div>
      )}

      <button className="run-btn" onClick={onRun} disabled={isRunning || !p.preset}>
        {isRunning ? 'Running…' : 'Run GA'}
      </button>

      {isRunning && (
        <>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}
    </aside>
  )
}
