import { useState, useEffect } from 'react'
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
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col antialiased">
      {/* Top navigation header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-xs">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
                AugmentStudio
              </h1>
              <p className="text-[11px] text-slate-400 leading-tight">
                Dataset Augmentation Studio
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-slate-100/70 px-3 py-1 rounded-full border border-slate-200/60">
            <span>Local YOLO Image Augmentation & Annotation Transformation</span>
          </div>

          {/* Backend connectivity status badge */}
          <div className="flex items-center gap-2">
            {backendOnline === null && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                <Activity size={12} className="animate-pulse" />
                Connecting�
              </span>
            )}
            {backendOnline === true && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Backend online
              </span>
            )}
            {backendOnline === false && (
              <span className="flex items-center gap-1.5 text-xs text-red-700 font-medium bg-red-50 px-2.5 py-1 rounded-full border border-red-200/80">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Backend offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Backend offline alert banner */}
      {backendOnline === false && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-xs sm:text-sm text-red-700 font-medium">
          ?? Backend service is not reachable. Start it with:{' '}
          <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono text-xs">
            cd backend && python main.py
          </code>
        </div>
      )}

      {/* Main Combined Workspace Container (3 Rows) */}
      <main className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5 flex-1">
        {/* ROW 1: Two Columns (Left: Dataset Selection, Right: Dataset Preview & Validation) */}
        <section aria-label="Dataset Configuration and Inspection">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* Row 1 Left: Dataset Selection */}
            <div className="lg:col-span-5 flex flex-col">
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
            </div>

            {/* Row 1 Right: Dataset Preview & Validation */}
            <div className="lg:col-span-7 flex flex-col">
              <DatasetInspector
                datasetPath={datasetPath}
                scanResult={scanResult}
              />
            </div>
          </div>
        </section>

        {/* ROW 2: Two Columns (Left: Image Augmentation, Right: Preview Transformation) */}
        <section aria-label="Augmentation Configuration and Live Preview">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* Row 2 Left: Image Augmentation */}
            <div className="lg:col-span-5 flex flex-col min-w-0">
              <AugmentationPanel
                enabled={augEnabled}
                onEnabledChange={setAugEnabled}
                selectedAugs={augmentations}
                onAugsChange={setAugmentations}
              />
            </div>

            {/* Row 2 Right: Preview Transformation */}
            <div className="lg:col-span-7 flex flex-col min-w-0">
              <PreviewPanel
                datasetPath={datasetPath}
                scanResult={scanResult}
                augmentations={augEnabled ? augmentations : []}
              />
            </div>
          </div>
        </section>

        {/* ROW 3: Full Width (Output & Generation) */}
        <section aria-label="Output Destination and Dataset Generation">
          <div className="w-full">
            <OutputPanel
              datasetPath={datasetPath}
              outputPath={outputPath}
              scanResult={scanResult}
              augmentations={augmentations}
              augEnabled={augEnabled}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3 border-t border-slate-200/80 bg-white/50">
        Dataset Augmentation Studio � All processing is strictly local � No images or annotations leave your machine.
      </footer>
    </div>
  )
}

export default App
