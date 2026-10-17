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
      setError('Please enter a dataset path.')
      return
    }
    setScanning(true)
    setError(null)
    try {
      const result = await scanDataset(datasetPath)
      onScanComplete(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (err as Error)?.message
        || 'Scan failed'
      setError(msg)
    } finally {
      setScanning(false)
    }
  }

  return (
    <SectionCard
      number={1}
      title="Dataset Selection"
      icon={<Folder size={18} />}
      color="#3b82f6"
    >
      <div className="flex flex-col gap-4">
        {/* Path inputs row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Dataset folder */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Input Dataset Folder
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <FolderOpen size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={datasetPath}
                  onChange={e => onDatasetPathChange(e.target.value)}
                  placeholder="e.g. D:\datasets\my_dataset"
                  className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Expected structure: images/ and labels/</p>
          </div>

          {/* Output folder */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Output Folder
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <FolderOpen size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={outputPath}
                  onChange={e => onOutputPathChange(e.target.value)}
                  placeholder="e.g. D:\augmented_dataset"
                  className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Augmented dataset will be saved here (originals preserved)</p>
          </div>

          {/* Scan button */}
          <div className="flex items-end">
            <Button
              onClick={handleScan}
              loading={scanning}
              disabled={!datasetPath.trim()}
              size="md"
              className="whitespace-nowrap h-10"
            >
              <ScanLine size={16} />
              Scan Dataset
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert type="error">
            <XCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Stat cards */}
        {scanResult && (
          <div className="fade-in grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Images found"
              value={scanResult.image_count}
              icon={<ScanLine size={16} />}
              color="#3b82f6"
            />
            <StatCard
              label="Labels matched"
              value={scanResult.label_count}
              icon={<CheckCircle2 size={16} />}
              color="#22c55e"
            />
            <StatCard
              label="Missing labels"
              value={scanResult.missing_labels}
              icon={<AlertCircle size={16} />}
              color="#f59e0b"
              alert
            />
            <StatCard
              label="Invalid annotations"
              value={scanResult.invalid_annotations}
              icon={<XCircle size={16} />}
              color="#ef4444"
              alert
            />
            <StatCard
              label="Classes detected"
              value={Object.keys(scanResult.class_distribution).length}
              icon={<Folder size={16} />}
              color="#8b5cf6"
            />
          </div>
        )}

        {scanResult && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} />
            <span>
              Dataset scanned — {scanResult.image_count} images, {Object.keys(scanResult.class_distribution).length} classes
              {scanResult.classes_file
                ? ` (classes: ${scanResult.classes_file.slice(0, 5).join(', ')}${scanResult.classes_file.length > 5 ? '…' : ''})`
                : ' (no classes.txt found)'}
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default DatasetSelection
