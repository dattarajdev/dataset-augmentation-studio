import React, { useState, useEffect } from 'react'
import { Eye, RefreshCw, ChevronDown, Info } from 'lucide-react'
import { previewAugmentation } from '../api'
import type { ScanResponse, AugmentationConfig, AugPreviewResponse } from '../api'
import { SectionCard, Button, Spinner, Alert } from './ui'

interface Props {
  datasetPath: string
  scanResult: ScanResponse | null
  augmentations: AugmentationConfig[]
}

// Build flat list of preview options from selected augmentations
function buildPreviewOptions(augs: AugmentationConfig[]): Array<{ label: string; type: string; params: Record<string, unknown> }> {
  const opts: Array<{ label: string; type: string; params: Record<string, unknown> }> = []
  for (const aug of augs) {
    if (aug.type === 'rotate360') {
      const count = Number(aug.params.count ?? 4)
      for (let i = 1; i <= count; i++) {
        const angle = (360 / count) * i
        if (angle >= 360) continue
        opts.push({ label: `360° Rotation (${Math.round(angle)}°)`, type: 'rotate360', params: { angle } })
      }
    } else {
      const labels: Record<string, string> = {
        flip_h: 'Horizontal Flip',
        flip_v: 'Vertical Flip',
        rotate: `Rotation (${aug.params.angle ?? 30}°)`,
        shear: 'Shear',
        crop: 'Crop',
        zoom: `Zoom (${aug.params.scale ?? 1.2}×)`,
        cutout: 'Cutout',
        mosaic: 'Mosaic',
      }
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
    if (imageFiles.length > 0 && !selectedImage) {
      setSelectedImage(imageFiles[0])
    }
  }, [imageFiles])

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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (err as Error)?.message || 'Preview failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!scanResult) {
    return (
      <SectionCard number={4} title="Preview Transformation" icon={<Eye size={18} />} color="#f59e0b">
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <Eye size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Scan a dataset and select augmentations to preview.</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard number={4} title="Preview Transformation" icon={<Eye size={18} />} color="#f59e0b">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        {/* Image selector */}
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Image</label>
          <div className="relative">
            <select
              value={selectedImage}
              onChange={e => { setSelectedImage(e.target.value); setPreview(null) }}
              className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 text-sm pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {imageFiles.slice(0, 100).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Augmentation selector */}
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-500 mb-1">Transformation</label>
          {previewOptions.length === 0 ? (
            <p className="text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg px-3 py-2">
              Enable augmentation and select transforms first
            </p>
          ) : (
            <div className="relative">
              <select
                value={selectedAugIdx}
                onChange={e => { setSelectedAugIdx(Number(e.target.value)); setPreview(null) }}
                className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 text-sm pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {previewOptions.map((opt, i) => (
                  <option key={i} value={i}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Preview button */}
        <Button
          onClick={handlePreview}
          loading={loading}
          disabled={!selectedImage || previewOptions.length === 0}
          variant="primary"
        >
          <RefreshCw size={14} />
          Preview
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert type="error">
          <span>{error}</span>
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Preview images */}
      {preview && !loading && (
        <div className="fade-in grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700">Original Image</h4>
              <span className="text-xs text-slate-400">{preview.original_width} × {preview.original_height}px</span>
            </div>
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <img
                src={`data:image/jpeg;base64,${preview.original_b64}`}
                alt="Original"
                className="w-full object-contain"
                style={{ maxHeight: 320 }}
              />
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Original Annotation (YOLO)</p>
              <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-24 text-slate-600">
                {preview.original_annotation || '(empty)'}
              </pre>
            </div>
          </div>

          {/* Augmented */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700">
                Augmented: <span className="text-blue-600">{previewOptions[selectedAugIdx]?.label}</span>
              </h4>
              <span className="text-xs text-slate-400">{preview.augmented_width} × {preview.augmented_height}px</span>
            </div>
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <img
                src={`data:image/jpeg;base64,${preview.augmented_b64}`}
                alt="Augmented"
                className="w-full object-contain"
                style={{ maxHeight: 320 }}
              />
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-slate-500 mb-1">Augmented Annotation (YOLO)</p>
              <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-24 text-slate-600">
                {preview.augmented_annotation || '(empty)'}
              </pre>
            </div>
          </div>

          {/* Info strip */}
          {preview.augmented_width !== preview.original_width ||
           preview.augmented_height !== preview.original_height ? (
            <div className="lg:col-span-2">
              <Alert type="info">
                <Info size={14} className="shrink-0" />
                <span>
                  Image canvas was expanded from {preview.original_width}×{preview.original_height} to{' '}
                  {preview.augmented_width}×{preview.augmented_height} to avoid cropping content.
                </span>
              </Alert>
            </div>
          ) : null}
        </div>
      )}

      {!preview && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <Eye size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Select an image and transformation, then click Preview</p>
        </div>
      )}
    </SectionCard>
  )
}

export default PreviewPanel
