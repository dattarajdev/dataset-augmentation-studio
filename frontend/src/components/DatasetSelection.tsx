import React, { useState } from 'react'
import { Folder, FolderOpen, ScanLine, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { SectionCard, StatCard, Button, Alert } from './ui'
import { scanDataset } from '../api'
import type { ScanResponse } from '../api'

interface Props {
  datasetPath: string
  outputPath: string
  onDatasetPathChange: (p: string) => void
  onOutputPathChange: (p: string) => void
  onScanComplete: (result: ScanResponse) => void
  scanResult: ScanResponse | null
}

const DatasetSelection: React.FC<Props> = ({
  datasetPath,
  outputPath,
  onDatasetPathChange,
  onOutputPathChange,
  onScanComplete,
  scanResult,
}) => {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    if (!datasetPath.trim()) {
      setError('Please enter an input dataset path.')
      return
    }
    setScanning(true)
    setError(null)
    try {
      const result = await scanDataset(datasetPath)
      onScanComplete(result)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Scan failed'
      setError(msg)
    } finally {
      setScanning(false)
    }
  }

  return (
    <SectionCard
      number={1}
      title="Dataset Selection"
      subtitle="Configure input and destination folders"
      icon={<Folder size={18} />}
      color="#3b82f6"
      className="h-full"
    >
      <div className="flex flex-col gap-3.5">
        {/* Input folder */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Input Dataset Folder
          </label>
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            <FolderOpen size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={datasetPath}
              onChange={e => onDatasetPathChange(e.target.value)}
              placeholder="e.g. D:\datasets\my_dataset"
              className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires images/ and labels/ subdirectories</p>
        </div>

        {/* Output folder */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Output Destination Folder
          </label>
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            <FolderOpen size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={outputPath}
              onChange={e => onOutputPathChange(e.target.value)}
              placeholder="e.g. D:\augmented_output"
              className="w-full text-xs sm:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Augmented data and labels will be saved here</p>
        </div>

        {/* Scan Action */}
        <div className="pt-0.5">
          <Button
            onClick={handleScan}
            loading={scanning}
            disabled={!datasetPath.trim()}
            variant="primary"
            size="md"
            className="w-full justify-center shadow-xs"
          >
            <ScanLine size={16} />
            Scan Dataset
          </Button>
        </div>

        {/* Error notification */}
        {error && (
          <Alert type="error" className="fade-in">
            <XCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Scanned summary & compact stats */}
        {scanResult && (
          <div className="fade-in flex flex-col gap-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Scan Summary</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} /> Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard
                label="Images"
                value={scanResult.image_count}
                icon={<ScanLine size={14} />}
                color="#3b82f6"
                compact
              />
              <StatCard
                label="Labels"
                value={scanResult.label_count}
                icon={<CheckCircle2 size={14} />}
                color="#22c55e"
                compact
              />
              <StatCard
                label="Classes"
                value={Object.keys(scanResult.class_distribution).length}
                icon={<Folder size={14} />}
                color="#8b5cf6"
                compact
              />
              <StatCard
                label="Missing"
                value={scanResult.missing_labels}
                icon={<AlertCircle size={14} />}
                color="#f59e0b"
                alert
                compact
              />
              <StatCard
                label="Invalid"
                value={scanResult.invalid_annotations}
                icon={<XCircle size={14} />}
                color="#ef4444"
                alert
                compact
              />
            </div>

            {scanResult.classes_file && scanResult.classes_file.length > 0 && (
              <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-200/80">
                <span className="font-semibold text-slate-600">Detected classes:</span>{' '}
                {scanResult.classes_file.slice(0, 6).join(', ')}
                {scanResult.classes_file.length > 6 ? '�' : ''}
              </div>
            )}
          </div>
        )}

        {/* Compact empty state */}
        {!scanResult && !error && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
            <p className="text-xs text-slate-500 font-medium">Ready to inspect</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter dataset path and click Scan Dataset to load validation and preview.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default DatasetSelection
