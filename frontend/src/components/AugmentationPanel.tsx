import React, { useState } from 'react'
import {
  Layers,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RefreshCw,
  Scissors,
  Crop,
  ZoomIn,
  Square,
  Grid2x2,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react'
import { SectionCard, Toggle, Badge } from './ui'
import type { AugmentationConfig } from '../api'

// ---- Types -----------------------------------------------------------------

interface SettingDef {
  key: string
  label: string
  type: 'number' | 'range'
  min?: number
  max?: number
  step?: number
  default: number
}

interface AugCardDef {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  defaultParams: Record<string, unknown>
  settings?: SettingDef[]
}

// ---- Augmentation definitions ---------------------------------------------

const AUG_CARDS: AugCardDef[] = [
  {
    id: 'flip_h',
    label: 'Horizontal Flip',
    description: 'Flip horizontally',
    icon: <FlipHorizontal size={18} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: 'flip_v',
    label: 'Vertical Flip',
    description: 'Flip vertically',
    icon: <FlipVertical size={18} />,
    defaultParams: {},
    settings: [],
  },
  {
    id: 'rotate',
    label: 'Rotation',
    description: 'Custom angle rotation',
    icon: <RotateCcw size={18} />,
    defaultParams: { angle: 30 },
    settings: [
      { key: 'angle', label: 'Angle (�)', type: 'range', min: -180, max: 180, step: 1, default: 30 },
    ],
  },
  {
    id: 'rotate360',
    label: '360� Rotation',
    description: 'N-angle full circle generator',
    icon: <RefreshCw size={18} />,
    defaultParams: { count: 4 },
    settings: [
      { key: 'count', label: 'Interval count (X)', type: 'number', min: 2, max: 36, step: 1, default: 4 },
    ],
  },
  {
    id: 'shear',
    label: 'Shear',
    description: 'Affine shear skew',
    icon: <Scissors size={18} />,
    defaultParams: { shear_x: 0.2, shear_y: 0.0 },
    settings: [
      { key: 'shear_x', label: 'Shear X', type: 'range', min: -0.5, max: 0.5, step: 0.05, default: 0.2 },
      { key: 'shear_y', label: 'Shear Y', type: 'range', min: -0.5, max: 0.5, step: 0.05, default: 0.0 },
    ],
  },
  {
    id: 'crop',
    label: 'Crop',
    description: 'Margin crop region',
    icon: <Crop size={18} />,
    defaultParams: { crop_x: 0.1, crop_y: 0.1 },
    settings: [
      { key: 'crop_x', label: 'Crop X margin', type: 'range', min: 0.01, max: 0.4, step: 0.01, default: 0.1 },
      { key: 'crop_y', label: 'Crop Y margin', type: 'range', min: 0.01, max: 0.4, step: 0.01, default: 0.1 },
    ],
  },
  {
    id: 'zoom',
    label: 'Zoom',
    description: 'Scale in or out',
    icon: <ZoomIn size={18} />,
    defaultParams: { scale: 1.2 },
    settings: [
      { key: 'scale', label: 'Scale factor', type: 'range', min: 0.5, max: 2.5, step: 0.05, default: 1.2 },
    ],
  },
  {
    id: 'cutout',
    label: 'Cutout',
    description: 'Random occlusion masking',
    icon: <Square size={18} />,
    defaultParams: { num_holes: 3, hole_size: 0.1 },
    settings: [
      { key: 'num_holes', label: 'Number of holes', type: 'number', min: 1, max: 10, step: 1, default: 3 },
      { key: 'hole_size', label: 'Hole size fraction', type: 'range', min: 0.05, max: 0.4, step: 0.01, default: 0.1 },
    ],
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    description: '2�2 4-image synthesis',
    icon: <Grid2x2 size={18} />,
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
  disabled?: boolean
}

const AugCard: React.FC<AugCardProps> = ({
  card,
  selected,
  params,
  onToggle,
  onParamChange,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false)
  const hasSettings = Boolean(card.settings && card.settings.length > 0)

  // Settings are hidden until the card is selected
  const showSettings = selected && hasSettings && expanded

  return (
    <div
      className={`border rounded-xl p-2.5 transition-all select-none flex flex-col justify-between ${
        disabled
          ? 'opacity-60 bg-slate-50/60 border-slate-200 cursor-not-allowed'
          : selected
          ? 'border-blue-500 bg-blue-50/70 shadow-xs'
          : 'border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Header row */}
        <div className="flex items-start gap-2">
          {/* Accessible Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={onToggle}
            aria-label={`Toggle ${card.label}`}
            className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0 disabled:cursor-not-allowed"
          />

          {/* Icon */}
          <div
            className={`p-1.5 rounded-md shrink-0 transition-colors ${
              selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {card.icon}
          </div>

          {/* Labels */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => !disabled && onToggle()}
          >
            <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight truncate">
              {card.label}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
              {card.description}
            </p>
          </div>

          {/* Contextual Settings toggle button (only visible when selected!) */}
          {selected && hasSettings && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setExpanded(v => !v)
              }}
              title="Configure parameters"
              className="p-1 rounded text-blue-700 hover:bg-blue-100/80 transition-colors shrink-0"
            >
              {expanded ? <ChevronUp size={14} /> : <SlidersHorizontal size={14} />}
            </button>
          )}
        </div>

        {/* Quick parameters summary badge when selected but collapsed */}
        {selected && hasSettings && !expanded && (
          <div className="mt-1.5 pt-1 border-t border-blue-200/50 flex items-center justify-between text-[10px] text-blue-700">
            <span className="truncate">
              {card.settings?.map(s => `${s.label.split(' ')[0]}: ${Number(params[s.key] ?? s.default)}`).join(', ')}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-medium hover:underline ml-1 shrink-0"
            >
              Adjust
            </button>
          </div>
        )}
      </div>

      {/* Contextual Settings Section (hidden until relevant) */}
      {showSettings && (
        <div className="mt-2 pt-2 border-t border-blue-200/60 flex flex-col gap-2 fade-in">
          {card.settings!.map(setting => (
            <div key={setting.key}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[11px] text-slate-700 font-medium truncate">
                  {setting.label}
                </label>
                <span className="text-[10px] font-mono text-blue-800 bg-white/80 border border-blue-200 px-1 py-0.2 rounded shrink-0">
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
                  className="w-full accent-blue-600 h-1.5 cursor-pointer"
                />
              ) : (
                <input
                  type="number"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  value={Number(params[setting.key] ?? setting.default)}
                  onChange={e => onParamChange(setting.key, Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
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
  enabled,
  onEnabledChange,
  selectedAugs,
  onAugsChange,
}) => {
  const getConfig = (id: string): AugmentationConfig | undefined =>
    selectedAugs.find(a => a.type === id)

  const isSelected = (id: string) => Boolean(getConfig(id))

  const toggleCard = (card: AugCardDef) => {
    if (isSelected(card.id)) {
      onAugsChange(selectedAugs.filter(a => a.type !== card.id))
    } else {
      onAugsChange([...selectedAugs, { type: card.id, params: { ...card.defaultParams } }])
    }
  }

  const updateParam = (id: string, key: string, val: number) => {
    onAugsChange(
      selectedAugs.map(a =>
        a.type === id ? { ...a, params: { ...a.params, [key]: val } } : a
      )
    )
  }

  const handleSelectAll = () => {
    const allConfigs: AugmentationConfig[] = AUG_CARDS.map(card => ({
      type: card.id,
      params: { ...card.defaultParams },
    }))
    onAugsChange(allConfigs)
  }

  const handleClearAll = () => {
    onAugsChange([])
  }

  // Header action: Toggle + Selected count chip
  const headerAction = (
    <div className="flex items-center gap-2.5">
      {enabled && selectedAugs.length > 0 && (
        <Badge color="blue" className="font-semibold">
          {selectedAugs.length} active
        </Badge>
      )}
      <Toggle
        checked={enabled}
        onChange={onEnabledChange}
        id="toggle-augmentation-enable"
        label={enabled ? 'Enabled' : 'Disabled'}
      />
    </div>
  )

  return (
    <SectionCard
      number={3}
      title="Image Augmentation"
      subtitle="Select & configure geometric transformations"
      icon={<Layers size={18} />}
      color="#10b981"
      headerAction={headerAction}
      className="h-full"
    >
      <div className="flex flex-col gap-3">
        {/* Sub-header controls when enabled */}
        {enabled && (
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">
              Transformations ({selectedAugs.length} of {AUG_CARDS.length} selected)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Transformation Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AUG_CARDS.map(card => (
            <AugCard
              key={card.id}
              card={card}
              selected={enabled && isSelected(card.id)}
              params={getConfig(card.id)?.params ?? card.defaultParams}
              onToggle={() => toggleCard(card)}
              onParamChange={(key, val) => updateParam(card.id, key, val)}
              disabled={!enabled}
            />
          ))}
        </div>

        {/* Compact empty state / guidance */}
        {!enabled && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-2.5 text-center">
            <p className="text-xs text-slate-500 font-medium">Augmentation is currently disabled</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Turn on the switch in the card header above to enable and customize transformations.
            </p>
          </div>
        )}

        {enabled && selectedAugs.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-center text-xs text-amber-800">
            Select at least one transformation card to preview or generate augmentations.
          </div>
        )}
      </div>
    </SectionCard>
  )
}

export default AugmentationPanel
