import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Eye, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle2, BarChart2, Image as ImageIcon
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

  const loadPreview = useCallback(async (index: number) => {
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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (err as Error)?.message || 'Preview failed'
      setError(msg)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [datasetPath, imageFiles, scanResult])

  useEffect(() => {
    setCurrentIndex(0)
    setPreview(null)
  }, [scanResult])

  useEffect(() => {
    if (scanResult && imageFiles.length > 0) {
      loadPreview(currentIndex)
    }
  }, [currentIndex, loadPreview, scanResult])

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1))
  const next = () => setCurrentIndex(i => Math.min(total - 1, i + 1))

  const validationErrorsForCurrent = scanResult?.validation_errors.find(
    v => v.image_name === imageFiles[currentIndex]
  )

  if (!scanResult) {
    return (
      <SectionCard number={2} title="Dataset Preview & Validation" icon={<Eye size={18} />} color="#8b5cf6">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Eye size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Scan a dataset first to preview images and annotations.</p>
        </div>
      </SectionCard>
    )
  }

  if (total === 0) {
    return (
      <SectionCard number={2} title="Dataset Preview & Validation" icon={<Eye size={18} />} color="#8b5cf6">
        <Alert type="warning">
          <AlertTriangle size={16} />
          <span>No images found in the dataset.</span>
        </Alert>
      </SectionCard>
    )
  }

  return (
    <SectionCard number={2} title="Dataset Preview & Validation" icon={<Eye size={18} />} color="#8b5cf6">
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Left: image list */}
        <div className="w-full xl:w-48 shrink-0">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Images</p>
            </div>
            <div className="overflow-y-auto max-h-80">
              {imageFiles.slice(0, 200).map((name, i) => {
                const hasError = scanResult.validation_errors.some(v => v.image_name === name)
                const isMissing = !scanResult.image_files.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-center justify-between gap-2 ${
                      i === currentIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {hasError && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                  </button>
                )
              })}
              {imageFiles.length > 200 && (
                <p className="text-xs text-slate-400 px-3 py-2">…and {imageFiles.length - 200} more</p>
              )}
            </div>
          </div>
        </div>

        {/* Center: image preview */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Image display */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: 280 }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <Spinner />
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{error}</p>
                </div>
              </div>
            )}
            {preview && !loading && (
              <img
                src={`data:image/jpeg;base64,${preview.image_b64}`}
                alt={imageFiles[currentIndex]}
                className="w-full object-contain"
                style={{ maxHeight: 360 }}
              />
            )}

            {/* Validation badge */}
            {preview && validationErrorsForCurrent && (
              <div className="absolute top-2 right-2">
                <Badge color="red">
                  {validationErrorsForCurrent.errors.length} error{validationErrorsForCurrent.errors.length > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
            {preview && !validationErrorsForCurrent && (
              <div className="absolute top-2 right-2">
                <Badge color="green">✓ Valid</Badge>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs text-slate-500 text-center">
              <span className="font-semibold text-slate-700">{currentIndex + 1}</span> / {total}
              {imageFiles[currentIndex] && (
                <span className="block text-slate-400 truncate max-w-48">{imageFiles[currentIndex]}</span>
              )}
            </div>
            <button
              onClick={next}
              disabled={currentIndex === total - 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(['annotation', 'validation', 'imageinfo'] as ActiveTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'annotation' ? 'Annotation (YOLO)' : tab === 'imageinfo' ? 'Image Info' : 'Validation'}
                </button>
              ))}
            </div>

            <div className="p-3 min-h-28">
              {activeTab === 'annotation' && (
                <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap overflow-auto max-h-40">
                  {preview?.annotation_text || '(no annotation)'}
                </pre>
              )}
              {activeTab === 'validation' && (
                <div className="flex flex-col gap-1">
                  {preview?.validation_errors && preview.validation_errors.length > 0 ? (
                    preview.validation_errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        {e}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 size={14} />
                      All annotations valid
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'imageinfo' && preview && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-500 mb-0.5">Dimensions</p>
                    <p className="font-semibold">{preview.width} × {preview.height}px</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-slate-500 mb-0.5">Objects</p>
                    <p className="font-semibold">{preview.boxes.length} bounding box{preview.boxes.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2 col-span-2">
                    <p className="text-slate-500 mb-1">Classes in image</p>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(preview.boxes.map(b => b[0]))].map(cls => {
                        const classIdx = Number(cls)
                        const name = scanResult.classes_file?.[classIdx] ?? `class_${classIdx}`
                        return (
                          <span
                            key={cls}
                            className="px-1.5 py-0.5 rounded text-white text-xs"
                            style={{ backgroundColor: CLASS_COLORS[classIdx % CLASS_COLORS.length] }}
                          >
                            {name}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: class distribution */}
        <div className="w-full xl:w-56 shrink-0">
          <div className="border border-slate-200 rounded-lg overflow-hidden h-full">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
              <BarChart2 size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Class Distribution</p>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {Object.entries(scanResult.class_distribution)
                .sort((a, b) => b[1] - a[1])
                .map(([cls, count], i) => {
                  const maxCount = Math.max(...Object.values(scanResult.class_distribution))
                  const pct = Math.round((count / maxCount) * 100)
                  return (
                    <div key={cls}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-600 truncate max-w-28">{cls}</span>
                        <span className="text-xs font-semibold text-slate-700">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CLASS_COLORS[i % CLASS_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(scanResult.class_distribution).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No class data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default DatasetInspector
