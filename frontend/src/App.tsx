import React, { useState, useEffect } from 'react'
import { Activity, Layers } from 'lucide-react'
import DatasetSelection from './components/DatasetSelection'
import DatasetInspector from './components/DatasetInspector'
import AugmentationPanel from './components/AugmentationPanel'
import PreviewPanel from './components/PreviewPanel'
import OutputPanel from './components/OutputPanel'
import { checkHealth } from './api'
import type { ScanResponse, AugmentationConfig } from './api'

function App() {
  const [datasetPath, setDatasetPath] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [augEnabled, setAugEnabled] = useState(false)
  const [augmentations, setAugmentations] = useState<AugmentationConfig[]>([])
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  // Check backend health on mount
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">AugmentStudio</h1>
              <p className="text-xs text-slate-400 leading-tight">Dataset Augmentation</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>Create augmented versions of your dataset with geometric transformations</span>
          </div>

          {/* Backend status */}
          <div className="flex items-center gap-2">
            {backendOnline === null && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Activity size={12} className="animate-pulse" />
                Connecting…
              </span>
            )}
            {backendOnline === true && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Backend online
              </span>
            )}
            {backendOnline === false && (
              <span className="flex items-center gap-1.5 text-xs text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Backend offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Backend offline banner */}
      {backendOnline === false && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-sm text-red-700">
          ⚠️ Backend is not running. Start it with:{' '}
          <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono text-xs">
            cd backend && python main.py
          </code>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Section 1: Dataset Selection */}
        <DatasetSelection
          datasetPath={datasetPath}
          outputPath={outputPath}
          onDatasetPathChange={setDatasetPath}
          onOutputPathChange={setOutputPath}
          onScanComplete={result => {
            setScanResult(result)
          }}
          scanResult={scanResult}
        />

        {/* Section 2: Inspector */}
        <DatasetInspector
          datasetPath={datasetPath}
          scanResult={scanResult}
        />

        {/* Section 3: Augmentation Panel */}
        <AugmentationPanel
          enabled={augEnabled}
          onEnabledChange={setAugEnabled}
          selectedAugs={augmentations}
          onAugsChange={setAugmentations}
        />

        {/* Section 4: Preview */}
        <PreviewPanel
          datasetPath={datasetPath}
          scanResult={scanResult}
          augmentations={augEnabled ? augmentations : []}
        />

        {/* Section 5: Output */}
        <OutputPanel
          datasetPath={datasetPath}
          outputPath={outputPath}
          scanResult={scanResult}
          augmentations={augmentations}
          augEnabled={augEnabled}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 py-4">
          Dataset Augmentation Studio v1.0.0 — All processing is local. No data leaves your machine.
        </footer>
      </main>
    </div>
  )
}

export default App
