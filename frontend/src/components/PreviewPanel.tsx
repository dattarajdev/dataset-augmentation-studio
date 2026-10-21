import React, { useState, useEffect } from 'react'
import { Eye, RefreshCw, Info, ChevronDown, Sparkles } from 'lucide-react'
import { SectionCard, Button, Alert, Spinner } from './ui'
import { previewAugmentation } from '../api'
import type { ScanResponse, AugmentationConfig, AugPreviewResponse } from '../api'

interface Props {
  datasetPath: string
  scanResult: ScanResponse | null
  augmentations: AugmentationConfig[]
}

interface PreviewOption {
  label: string
  type: string
  params: Record<string, unknown>
}

const buildPreviewOptions = (augmentations: AugmentationConfig[]): PreviewOption[] => {
  const labels: Record<string, string> = {
    flip_h: 'Horizontal Flip',
    flip_v: 'Vertical Flip',
    rotate: 'Rotation',
    rotate360: '360� Rotation',
    shear: 'Shear',
    crop: 'Crop',
    zoom: 'Zoom',
    cutout: 'Cutout',
    mosaic: 'Mosaic',
  }

  const opts: PreviewOption[] = []
  for (const aug of augmentations) {
    if (aug.type === 'rotate360') {
      const count = Number(aug.params.count ?? 4)
      for (let i = 0; i < count; i++) {
        const angle = Math.round(((i + 1) * 360) / count)
        if (angle < 360) {
          opts.push({
            label: `360� Rotation (${angle}�)`,
            type: 'rotate360',
            params: { ...aug.params, angle_index: i },
          })
        }
      }
    } else {
      opts.push({ label: labels[aug.type] ?? aug.type, type: aug.type, params: aug.params })
    }
  }
  return opts
}

const PreviewPanel: React.FC<Props> = ({ datasetPath, scanResult, augmentations }) => {
  const [selectedImage, setSelectedImage] = useState('')
  const [selectedAugIdx, setSelectedAugIdx] = useState(0)
  const [preview, setPreview] = useState<AugPreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageFiles = scanResult?.image_files ?? []
  const previewOptions = buildPreviewOptions(augmentations)

  useEffect(() => {
    if (imageFiles.length > 0 && (!selectedImage || !imageFiles.includes(selectedImage))) {
      setSelectedImage(imageFiles[0])
    }
  }, [imageFiles, selectedImage])

  useEffect(() => {
    setPreview(null)
  }, [augmentations])

  const handlePreview = async () => {
    if (!selectedImage || previewOptions.length === 0) return
    const opt = previewOptions[selectedAugIdx]
    if (!opt) return

    setLoading(true)
    setError(null)
    try {
      const result = await previewAugmentation(datasetPath, selectedImage, opt.type, opt.params)
      setPreview(result)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Preview failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Empty state if not scanned
  if (!scanResult) {
    return (
      <SectionCard
        number={4}
        title="Preview Transformation"
        subtitle="Original vs augmented verification"
        icon={<Eye size={18} />}
        color="#f59e0b"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-2.5">
            <Eye size={20} className="opacity-80" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-700">Preview Unavailable</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Scan a dataset in Row 1 and select augmentations in Row 2 to preview transformed images.
          </p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      number={4}
      title="Preview Transformation"
      subtitle="Original vs augmented verification"
      icon={<Eye size={18} />}
      color="#f59e0b"
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        {/* Controls row */}
        <div className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 p-2 bg-slate-50 border border-slate-200/90 rounded-lg">
          {/* Image select */}
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Source Image
            </label>
            <div className="relative">
              <select
                value={selectedImage}
                onChange={e => {
                  setSelectedImage(e.target.value)
                  setPreview(null)
                }}
                className="w-full appearance-none border border-slate-300 rounded-md px-2.5 py-1.5 text-xs pr-7 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                {imageFiles.map(f => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Transformation select */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Transformation
            </label>
            {previewOptions.length === 0 ? (
              <p className="text-xs text-slate-400 border border-dashed border-slate-300 rounded-md px-2.5 py-1.5 bg-white">
                Select a transform in Row 2
              </p>
            ) : (
              <div className="relative">
                <select
                  value={selectedAugIdx}
                  onChange={e => {
                    setSelectedAugIdx(Number(e.target.value))
                    setPreview(null)
                  }}
                  className="w-full appearance-none border border-slate-300 rounded-md px-2.5 py-1.5 text-xs pr-7 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  {previewOptions.map((opt, i) => (
                    <option key={i} value={i}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            )}
          </div>

          {/* Preview action button */}
          <Button
            onClick={handlePreview}
            loading={loading}
            disabled={!selectedImage || previewOptions.length === 0}
            variant="primary"
            size="md"
            className="whitespace-nowrap shrink-0 shadow-xs"
          >
            <RefreshCw size={14} />
            Preview
          </Button>
        </div>

        {/* Error notification */}
        {error && (
          <Alert type="error" className="fade-in">
            <span>{error}</span>
          </Alert>
        )}

        {/* Loading placeholder */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg bg-slate-50 border border-slate-200">
            <Spinner size="md" />
            <span className="text-xs text-slate-500 mt-2">Computing augmented geometry & bounding boxes...</span>
          </div>
        )}

        {/* Transformed Preview Results (Side-by-Side) */}
        {preview && !loading && (
          <div className="fade-in flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-4 w-full min-w-0">
              {/* Original preview card */}
              <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">Original</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {preview.original_width} � {preview.original_height}px
                  </span>
                </div>
                <div className="bg-slate-950 p-1 flex items-center justify-center min-h-[170px] max-h-[220px]">
                  <img
                    src={`data:image/jpeg;base64,${preview.original_b64}`}
                    alt="Original"
                    className="w-full h-full object-contain max-h-[210px]"
                  />
                </div>
                <div className="p-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Original Annotation (YOLO)
                  </p>
                  <pre className="text-[10px] font-mono bg-slate-50 border border-slate-200 rounded p-1.5 overflow-auto max-h-16 text-slate-600">
                    {preview.original_annotation || '(empty)'}
                  </pre>
                </div>
              </div>

              {/* Augmented preview card */}
              <div className="flex flex-col border border-blue-200 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/80 border-b border-blue-100">
                  <span className="text-xs font-semibold text-blue-800 flex items-center gap-1 truncate">
                    <Sparkles size={12} className="text-blue-600 shrink-0" />
                    <span className="truncate">{previewOptions[selectedAugIdx]?.label}</span>
                  </span>
                  <span className="text-[10px] font-mono text-blue-700 shrink-0">
                    {preview.augmented_width} � {preview.augmented_height}px
                  </span>
                </div>
                <div className="bg-slate-950 p-1 flex items-center justify-center min-h-[170px] max-h-[220px]">
                  <img
                    src={`data:image/jpeg;base64,${preview.augmented_b64}`}
                    alt="Augmented"
                    className="w-full h-full object-contain max-h-[210px]"
                  />
                </div>
                <div className="p-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                    Transformed Annotation (YOLO)
                  </p>
                  <pre className="text-[10px] font-mono bg-blue-50/50 border border-blue-100 rounded p-1.5 overflow-auto max-h-16 text-slate-700">
                    {preview.augmented_annotation || '(empty)'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Canvas size expansion note if applicable */}
            {(preview.augmented_width !== preview.original_width ||
              preview.augmented_height !== preview.original_height) && (
                <Alert type="info">
                  <Info size={13} className="shrink-0 mt-0.5" />
                  <span>
                    Canvas adjusted from {preview.original_width}�{preview.original_height} to{' '}
                    {preview.augmented_width}�{preview.augmented_height}px to contain rotated content.
                  </span>
                </Alert>
              )}
          </div>
        )}

        {/* Empty state when ready to preview */}
        {!preview && !loading && !error && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
            <p className="text-xs text-slate-600 font-medium">Ready to preview transformation</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select an image and transformation above, then click Preview to inspect bounding box mapping.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default PreviewPanel
