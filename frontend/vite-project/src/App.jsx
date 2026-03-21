import { useState, useRef } from 'react'
import { api } from './api'
import ToastContainer, { useToast } from './components/Toast'
import Sidebar from './components/Sidebar'
import VisualizationTab from './components/VisualizationTab'
import ResultTab from './components/ResultTab'
import HowItWorksTab from './components/HowItWorksTab'
import DataSourceTab from './components/DataSourceTab'
import ComparisonsTab from './components/ComparisonsTab'

const TABS = [
  { key: 'viz', label: 'Visualization' },
  { key: 'result', label: 'Result' },
  { key: 'compare', label: 'Comparisons' },
  { key: 'how', label: 'How It Works' },
  { key: 'data', label: 'Data Source' },
]

const DEFAULT_PARAMS = {
  preset: '',
  pop_size: 60,
  generations: 150,
  elite_size: 5,
  penalty_lambda: 1e6,
  selection: { method: 'tournament', tournament_size: 3 },
  crossover: { method: 'uniform', rate: 0.8 },
  mutation: { method: 'gaussian', rate: 0.15, sigma: 50 },
}

export default function App() {
  const [tab, setTab] = useState('viz')
  const [gaParams, setGaParams] = useState(DEFAULT_PARAMS)
  const [history, setHistory] = useState([])
  const [currentResult, setCurrentResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const { toasts, showToast, removeToast } = useToast()
  const abortRef = useRef(null)

  const handleRun = async () => {
    if (!gaParams.preset) {
      showToast('Please select a preset first', 'error')
      return
    }
    abortRef.current = new AbortController()
    setIsRunning(true)
    setHistory([])
    setCurrentResult(null)

    try {
      const response = await api.runGA(gaParams)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === 'progress') {
            setHistory(prev => [...prev, data])
          } else if (data.type === 'result') {
            setCurrentResult(data)
            setIsRunning(false)
            showToast('GA run complete!', 'success')
          } else if (data.type === 'error') {
            showToast(data.message, 'error')
            setIsRunning(false)
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        showToast('Connection failed — is the backend running?', 'error')
      }
      setIsRunning(false)
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setIsRunning(false)
    showToast('Run cancelled', 'info')
  }

  const handleSave = async () => {
    if (!currentResult) return
    await api.saveResult({
      preset: currentResult.preset,
      ga_params: gaParams,
      total_cost: currentResult.total_cost,
      best_fitness: currentResult.best_fitness,
      convergence: currentResult.history,
      allocations: currentResult.allocations,
    })
  }

  return (
    <div className="app">
      <header className="header">
        <span className="logo">ClinkerGA</span>
        <nav className="tab-bar">
          {TABS.map(t => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="main-layout">
        <Sidebar
          gaParams={gaParams}
          setGaParams={setGaParams}
          onRun={handleRun}
          onCancel={handleCancel}
          isRunning={isRunning}
          history={history}
        />
        <main className="content">
          {tab === 'viz' && <VisualizationTab history={history} isRunning={isRunning} currentResult={currentResult} />}
          {tab === 'result' && <ResultTab currentResult={currentResult} gaParams={gaParams} onSave={handleSave} showToast={showToast} />}
          {tab === 'compare' && <ComparisonsTab currentResult={currentResult} showToast={showToast} />}
          {tab === 'how' && <HowItWorksTab />}
          {tab === 'data' && <DataSourceTab showToast={showToast} />}
        </main>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
