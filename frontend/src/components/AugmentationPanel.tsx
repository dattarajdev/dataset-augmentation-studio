import React, { useState } from 'react'
import {
  Layers, FlipHorizontal, FlipVertical, RotateCcw, RefreshCw,
  Scissors, Crop, ZoomIn, Square, Grid2x2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Toggle } from './ui'
import type { AugmentationConfig } from '../api'

// ---- Types -----------------------------------------------------------------

interface AugCardDef {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  defaultParams: Record<string, unknown>
  settings?: SettingDef[]
}

interface SettingDef {
  key: string
  label: string
  type: 'number' | 'range'
  min?: number
  max?: number
  step?: number
  default: number
}

// ---- Augmentation definitions ---------------------------------------------

const AUG_CARDS: AugCardDef[] = [
  {
    id: 'flip_h',
    label: 'Horizontal Flip',
    description: 'Flip image horizontally',
    icon: <FlipHorizontal size={22} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: 'flip_v',
    label: 'Vertical Flip',
    description: 'Flip image vertically',
    icon: <FlipVertical size={22} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: 'rotate',
    label: 'Rotation',
    description: 'Rotate by custom angle',
    icon: <RotateCcw size={22} />,
    defaultParams: { angle: 30 },
    settings: [
      { key: 'angle', label: 'Angle (degrees)', type: 'range', min: -180, max: 180, step: 1, default: 30 },
    ],
  },
  {
    id: 'rotate360',
    label: '360° Rotation',
    description: 'Generate X rotated images',
    icon: <RefreshCw size={22} />,
    defaultParams: { count: 4 },
    settings: [
      { key: 'count', label: 'Interval count (X)', type: 'number', min: 2, max: 36, step: 1, default: 4 },
    ],
  },
  {
    id: 'shear',
    label: 'Shear',
    description: 'Apply shear transformation',
    icon: <Scissors size={22} />,
    defaultParams: { shear_x: 0.2, shear_y: 0.0 },
    settings: [
      { key: 'shear_x', label: 'Shear X', type: 'range', min: -0.5, max: 0.5, step: 0.05, default: 0.2 },
      { key: 'shear_y', label: 'Shear Y', type: 'range', min: -0.5, max: 0.5, step: 0.05, default: 0.0 },
    ],
  },
  {
    id: 'crop',
    label: 'Crop',
    description: 'Crop a region from image',
    icon: <Crop size={22} />,
    defaultParams: { crop_x: 0.1, crop_y: 0.1 },
    settings: [
      { key: 'crop_x', label: 'Crop X margin', type: 'range', min: 0.01, max: 0.4, step: 0.01, default: 0.1 },
      { key: 'crop_y', label: 'Crop Y margin', type: 'range', min: 0.01, max: 0.4, step: 0.01, default: 0.1 },
    ],
  },
  {
    id: 'zoom',
    label: 'Zoom',
    description: 'Zoom in or out',
    icon: <ZoomIn size={22} />,
    defaultParams: { scale: 1.2 },
    settings: [
      { key: 'scale', label: 'Scale factor', type: 'range', min: 0.5, max: 2.5, step: 0.05, default: 1.2 },
    ],
  },
  {
    id: 'cutout',
    label: 'Cutout',
    description: 'Randomly mask regions',
    icon: <Square size={22} />,
    defaultParams: { num_holes: 3, hole_size: 0.1 },
    settings: [
      { key: 'num_holes', label: 'Number of holes', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'hole_size', label: 'Hole size (fraction)', type: 'range', min: 0.05, max: 0.4, step: 0.01, default: 0.1 },
    ],
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    description: 'Combine 4 images into grid',
    icon: <Grid2x2 size={22} />,
    defaultParams: {},
    settings: [],
  },
]

// ---- Single augmentation card ---------------------------------------------

interface AugCardProps {
  card: AugCardDef
  selected: boolean
  params: Record<string, unknown>
  onToggle: () => void
  onParamChange: (key: string, val: number) => void
}

const AugCard: React.FC<AugCardProps> = ({ card, selected, params, onToggle, onParamChange }) => {
  const [expanded, setExpanded] = useState(false)
  const hasSettings = card.settings && card.settings.length > 0

  return (
    <div
      className={`aug-card border-2 rounded-xl p-3 transition-all select-none ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
        />

        {/* Icon */}
        <div
          className={`p-2 rounded-lg shrink-0 ${
            selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
          }`}
          onClick={onToggle}
        >
          {card.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <p className="text-sm font-semibold text-slate-800">{card.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
        </div>

        {/* Expand button */}
        {hasSettings && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Expanded settings */}
      {hasSettings && expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">
          {card.settings!.map(setting => (
            <div key={setting.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 font-medium">{setting.label}</label>
                <span className="text-xs font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  {Number(params[setting.key] ?? setting.default).toFixed(
                    setting.step && setting.step < 1 ? 2 : 0
                  )}
                </span>
              </div>
              {setting.type === 'range' ? (
                <input
                  type="range"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={Number(params[setting.key] ?? setting.default)}
                  onChange={e => onParamChange(setting.key, Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              ) : (
                <input
                  type="number"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={Number(params[setting.key] ?? setting.default)}
                  onChange={e => onParamChange(setting.key, Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {/* Show generated angles for rotate360 */}
              {card.id === 'rotate360' && setting.key === 'count' && (
                <p className="text-xs text-slate-400 mt-1">
                  Generates angles:{' '}
                  {Array.from({ length: Number(params[setting.key] ?? setting.default) }, (_, i) => {
                    const count = Number(params[setting.key] ?? setting.default)
                    const angle = ((i + 1) * 360) / count
                    return angle < 360 ? `${Math.round(angle)}°` : null
                  }).filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Main panel -----------------------------------------------------------

interface Props {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  selectedAugs: AugmentationConfig[]
  onAugsChange: (augs: AugmentationConfig[]) => void
}

const AugmentationPanel: React.FC<Props> = ({
  enabled, onEnabledChange, selectedAugs, onAugsChange
}) => {
  const getConfig = (id: string): AugmentationConfig | undefined =>
    selectedAugs.find(a => a.type === id)

  const isSelected = (id: string) => !!getConfig(id)

  const toggleCard = (card: AugCardDef) => {
    if (isSelected(card.id)) {
      onAugsChange(selectedAugs.filter(a => a.type !== card.id))
    } else {
      onAugsChange([...selectedAugs, { type: card.id, params: { ...card.defaultParams } }])
    }
  }

  const updateParam = (id: string, key: string, val: number) => {
    onAugsChange(selectedAugs.map(a =>
      a.type === id ? { ...a, params: { ...a.params, [key]: val } } : a
    ))
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <div className="section-badge text-white bg-emerald-500">3</div>
        <div className="text-emerald-500"><Layers size={18} /></div>
        <h2 className="text-base font-semibold text-slate-800">Image Augmentation</h2>
        <div className="ml-2">
          <Toggle
            checked={enabled}
            onChange={onEnabledChange}
            label="Enable image augmentation and select transformations"
          />
        </div>
      </div>

      {enabled && (
        <div className="p-5 fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {AUG_CARDS.map(card => (
              <AugCard
                key={card.id}
                card={card}
                selected={isSelected(card.id)}
                params={getConfig(card.id)?.params ?? card.defaultParams}
                onToggle={() => toggleCard(card)}
                onParamChange={(key, val) => updateParam(card.id, key, val)}
              />
            ))}
          </div>

          {selectedAugs.length === 0 && (
            <p className="text-center text-sm text-slate-400 mt-4">
              Select at least one augmentation above.
            </p>
          )}
        </div>
      )}

      {!enabled && (
        <div className="px-5 py-8 text-center text-slate-400 text-sm">
          Enable augmentation to select transformations.
        </div>
      )}
    </div>
  )
}

export default AugmentationPanel
