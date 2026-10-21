import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  BarChart2,
} from 'lucide-react'
import { SectionCard, Badge, Spinner, Alert } from './ui'
import { previewImage } from '../api'
import type { ScanResponse, ImagePreviewResponse } from '../api'

interface Props {
  datasetPath: string
  scanResult: ScanResponse | null
}

const CLASS_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#f97316', '#14b8a6', '#ec4899', '#6366f1', '#84cc16',
]

type ActiveTab = 'annotation' | 'validation' | 'imageinfo'

const DatasetInspector: React.FC<Props> = ({ datasetPath, scanResult }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [preview, setPreview] = useState<ImagePreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('annotation')
  const abortRef = useRef<AbortController | null>(null)

  const imageFiles = scanResult?.image_files ?? []
  const total = imageFiles.length

  const loadPreview = useCallback(
    async (index: number) => {
      if (!scanResult || imageFiles.length === 0) return
      const imageName = imageFiles[index]
      if (!imageName) return

      // Cancel previous request
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      setError(null)
      try {
        const result = await previewImage(datasetPath, imageName)
        setPreview(result)
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err as Error)?.message ||
          'Preview failed'
        setError(msg)
        setPreview(null)
      } finally {
        setLoading(false)
      }
    },
    [datasetPath, imageFiles, scanResult]
  )

  useEffect(() => {
    setCurrentIndex(0)
    setPreview(null)
  }, [scanResult])

  useEffect(() => {
    if (scanResult && imageFiles.length > 0) {
      loadPreview(currentIndex)
    }
  }, [currentIndex, loadPreview, scanResult, imageFiles.length])

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1))
  const next = () => setCurrentIndex(i => Math.min(total - 1, i + 1))

  const currentImageName = imageFiles[currentIndex] ?? ''
  const validationErrorsForCurrent = scanResult?.validation_errors.find(
    v => v.image_name === currentImageName
  )

  // Empty state before scan
  if (!scanResult) {
    return (
      <SectionCard
        number={2}
        title="Dataset Preview & Validation"
        subtitle="Visual inspector & bounding-box validation"
        icon={<Eye size={18} />}
        color="#8b5cf6"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2.5">
            <Eye size={20} className="opacity-80" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700">No Dataset Scanned Yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Scan a dataset in Row 1 Left to inspect images, verify YOLO bounding boxes, and check annotation validity.
          </p>
        </div>
      </SectionCard>
    )
  }

  // Scanned but 0 images
  if (total === 0) {
    return (
      <SectionCard
        number={2}
        title="Dataset Preview & Validation"
        icon={<Eye size={18} />}
        color="#8b5cf6"
        className="h-full"
      >
        <Alert type="warning">
          <AlertTriangle size={16} />
          <span>No images found in the dataset images/ directory.</span>
        </Alert>
      </SectionCard>
    )
  }

  // Header status badge
  const headerStatus = validationErrorsForCurrent ? (
    <Badge color="red" className="flex items-center gap-1">
      <AlertTriangle size={11} />
      {validationErrorsForCurrent.errors.length} issue{validationErrorsForCurrent.errors.length > 1 ? 's' : ''}
    </Badge>
  ) : (
    <Badge color="green" className="flex items-center gap-1">
      <CheckCircle2 size={11} /> Valid
    </Badge>
  )

  return (
    <SectionCard
      number={2}
      title="Dataset Preview & Validation"
      subtitle={`${total} images scanned`}
      icon={<Eye size={18} />}
      color="#8b5cf6"
      headerAction={headerStatus}
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        {/* Navigation & Image selector bar */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200/90 rounded-lg">
          <button
            type="button"
            onClick={prev}
            disabled={currentIndex === 0}
            aria-label="Previous image"
            className="p-1 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Image dropdown selector */}
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              {currentIndex + 1} / {total}
            </span>
            <select
              value={currentIndex}
              onChange={e => setCurrentIndex(Number(e.target.value))}
              aria-label="Select image to preview"
              className="text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 max-w-[200px] sm:max-w-[260px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {imageFiles.map((name, idx) => {
                const hasErr = scanResult.validation_errors.some(v => v.image_name === name)
                return (
                  <option key={name} value={idx}>
                    {hasErr ? '? ' : ''}{name}
                  </option>
                )
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={next}
            disabled={currentIndex === total - 1}
            aria-label="Next image"
            className="p-1 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Image Preview Canvas */}
        <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[220px] max-h-[280px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 text-white">
                <Spinner size="md" />
                <span className="text-xs text-slate-300">Rendering preview...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 text-center text-slate-400">
              <ImageIcon size={28} className="mx-auto mb-1.5 opacity-40 text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {preview && !loading && (
            <img
              src={`data:image/jpeg;base64,${preview.image_b64}`}
              alt={currentImageName}
              className="w-full h-full object-contain max-h-[280px]"
            />
          )}

          {/* Quick info chip overlaid bottom-left */}
          {preview && !loading && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-slate-300 font-mono">
              {preview.width} � {preview.height}px | {preview.boxes.length} box{preview.boxes.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>

        {/* Tabbed Inspection Details */}
        <div className="border border-slate-200/90 rounded-lg overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-200 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setActiveTab('annotation')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'annotation'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileText size={12} />
              Annotation (YOLO)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('validation')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'validation'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle size={12} />
              Validation
              {validationErrorsForCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('imageinfo')}
              className={`flex-1 py-1.5 px-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'imageinfo'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BarChart2 size={12} />
              Details & Classes
            </button>
          </div>

          <div className="p-2.5 bg-white min-h-[90px] max-h-[130px] overflow-auto">
            {activeTab === 'annotation' && (
              <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                {preview?.annotation_text ? (
                  preview.annotation_text
                ) : (
                  <span className="text-slate-400 italic">No annotations recorded for this image</span>
                )}
              </pre>
            )}

            {activeTab === 'validation' && (
              <div className="flex flex-col gap-1.5 text-xs">
                {preview?.validation_errors && preview.validation_errors.length > 0 ? (
                  preview.validation_errors.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50/80 rounded px-2 py-1 border border-red-100"
                    >
                      <AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{e}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 py-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>All bounding boxes and normalized coordinates are valid.</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'imageinfo' && preview && (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Classes present:</span>
                  {[...new Set(preview.boxes.map(b => b[0]))].map(cls => {
                    const classIdx = Number(cls)
                    const name = scanResult.classes_file?.[classIdx] ?? `class_${classIdx}`
                    return (
                      <span
                        key={cls}
                        className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                        style={{ backgroundColor: CLASS_COLORS[classIdx % CLASS_COLORS.length] }}
                      >
                        {name} ({classIdx})
                      </span>
                    )
                  })}
                  {preview.boxes.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">No objects</span>
                  )}
                </div>

                {/* Class distribution progress bar mini-summary */}
                {Object.keys(scanResult.class_distribution).length > 0 && (
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Dataset Class Distribution
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(scanResult.class_distribution)
                        .slice(0, 8)
                        .map(([cls, count]) => (
                          <div key={cls} className="flex items-center gap-1 text-[11px]">
                            <span className="text-slate-600 truncate max-w-[90px]">{cls}:</span>
                            <span className="font-semibold text-slate-800">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default DatasetInspector
