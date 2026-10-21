import React, { useState, useEffect, useRef } from 'react'
import {
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  FileOutput,
  Calculator,
} from 'lucide-react'
import { SectionCard, Button, Alert } from './ui'
import { estimateOutput, generateDataset, getJobStatus } from '../api'
import type { AugmentationConfig, EstimateResponse, JobStatusResponse, ScanResponse } from '../api'

interface Props {
  datasetPath: string
  outputPath: string
  scanResult: ScanResponse | null
  augmentations: AugmentationConfig[]
  augEnabled: boolean
}

const OutputPanel: React.FC<Props> = ({
  datasetPath,
  outputPath,
  scanResult,
  augmentations,
  augEnabled,
}) => {
  const [preserveOriginals, setPreserveOriginals] = useState(true)
  const [createClassesFile, setCreateClassesFile] = useState(true)
  const [validateOutput, setValidateOutput] = useState(true)
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  // Fetch estimate whenever inputs change
  useEffect(() => {
    if (!datasetPath || !scanResult || !augEnabled || augmentations.length === 0) {
      setEstimate(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const est = await estimateOutput(datasetPath, augmentations, preserveOriginals)
        setEstimate(est)
      } catch {
        setEstimate(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [datasetPath, augmentations, preserveOriginals, augEnabled, scanResult])

  // Poll job status
  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = window.setInterval(async () => {
      try {
        const status = await getJobStatus(id)
        setJobStatus(status)
        if (status.status !== 'running') {
          if (pollRef.current) clearInterval(pollRef.current)
          setGenerating(false)
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current)
        setGenerating(false)
      }
    }, 800)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const canGenerate =
    Boolean(datasetPath) &&
    Boolean(outputPath) &&
    Boolean(scanResult) &&
    augEnabled &&
    augmentations.length > 0 &&
    !generating

  const handleGenerate = async () => {
    if (!datasetPath || !outputPath) {
      setError('Please set both input dataset and output destination paths.')
      return
    }
    if (!augEnabled || augmentations.length === 0) {
      setError('Enable augmentation and select at least one transformation.')
      return
    }
    setError(null)
    setJobStatus(null)
    setGenerating(true)

    try {
      const res = await generateDataset({
        dataset_path: datasetPath,
        output_path: outputPath,
        augmentations,
        preserve_originals: preserveOriginals,
        create_classes_file: createClassesFile,
        validate_output: validateOutput,
      })
      startPolling(res.job_id)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Generation failed'
      setError(msg)
      setGenerating(false)
    }
  }

  return (
    <SectionCard
      number={5}
      title="Output & Generation"
      subtitle="Destination paths, options, estimation & batch execution"
      icon={<FileOutput size={18} />}
      color="#059669"
      className="w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {/* Column 1: Output Destination & Options */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">
            <Settings size={13} className="text-slate-400" />
            Destination & Settings
          </div>

          {/* Paths summary */}
          <div className="flex flex-col gap-2">
            <div className="bg-slate-50 rounded-lg border border-slate-200/90 px-3 py-2">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-0.5">
                <FolderOpen size={12} /> Source Dataset
              </span>
              <p className="text-xs font-mono text-slate-800 truncate" title={datasetPath || 'None specified'}>
                {datasetPath || '�'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200/90 px-3 py-2">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-0.5">
                <FileOutput size={12} /> Target Destination
              </span>
              <p className="text-xs font-mono text-slate-800 truncate" title={outputPath || 'None specified'}>
                {outputPath || '�'}
              </p>
            </div>
          </div>

          {/* Generation Options checkboxes */}
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={preserveOriginals}
                onChange={e => setPreserveOriginals(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span>Preserve original images in output</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={createClassesFile}
                onChange={e => setCreateClassesFile(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span>Generate class mapping (classes.txt)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={validateOutput}
                onChange={e => setValidateOutput(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span>Validate all transformed annotations</span>
            </label>
          </div>
        </div>

        {/* Column 2: Estimated Output & Status */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">
            <Calculator size={13} className="text-slate-400" />
            Output Estimation
          </div>

          {/* Estimated output tile */}
          {estimate ? (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg fade-in">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-md p-2 border border-slate-200/80">
                  <p className="text-base sm:text-lg font-bold text-slate-700">
                    {estimate.original_count.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tight">Original</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-blue-200">
                  <p className="text-base sm:text-lg font-bold text-blue-600">
                    +{estimate.augmented_count.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-blue-500 uppercase tracking-tight">Augmented</p>
                </div>
                <div className="bg-white rounded-md p-2 border border-emerald-200">
                  <p className="text-base sm:text-lg font-bold text-emerald-600">
                    {estimate.total_count.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-600 uppercase tracking-tight font-semibold">Total Files</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Estimated dataset expansion factor:{' '}
                <span className="font-semibold text-slate-700">
                  {estimate.original_count > 0
                    ? `${(estimate.total_count / estimate.original_count).toFixed(1)}�`
                    : '�'}
                </span>
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-600 font-medium">Estimate Pending</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Scan dataset and enable augmentations to calculate output volume.
              </p>
            </div>
          )}

          {/* Contextual Guidance */}
          {!augEnabled && (
            <Alert type="warning">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Enable image augmentation in Row 2 to proceed with generation.</span>
            </Alert>
          )}

          {augEnabled && augmentations.length === 0 && (
            <Alert type="warning">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Select at least one transformation in Row 2.</span>
            </Alert>
          )}

          {error && (
            <Alert type="error" className="fade-in">
              <XCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </Alert>
          )}
        </div>

        {/* Column 3: Action & Progress */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-100">
            <Play size={13} className="text-slate-400" />
            Batch Generation
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!canGenerate}
            variant="primary"
            size="lg"
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md py-3 text-sm"
          >
            <Play size={18} />
            Generate Augmented Dataset
          </Button>

          {/* Progress / Status display */}
          {jobStatus && (
            <div className="fade-in flex flex-col gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 truncate mr-2">
                    {jobStatus.message}
                  </span>
                  <span className="font-mono text-slate-500 whitespace-nowrap">
                    {jobStatus.processed}/{jobStatus.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      jobStatus.status === 'done'
                        ? 'bg-emerald-500'
                        : jobStatus.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-600 progress-animating'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, jobStatus.progress))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{Math.round(jobStatus.progress)}%</span>
                  <span>{jobStatus.output_count} written</span>
                </div>
              </div>

              {/* Status Alert */}
              {jobStatus.status === 'done' && (
                <Alert type="success">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                  <span>Generation complete! {jobStatus.output_count} files saved to output.</span>
                </Alert>
              )}

              {jobStatus.status === 'error' && (
                <Alert type="error">
                  <XCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Generation failed: {jobStatus.message}</span>
                </Alert>
              )}

              {/* Warning list */}
              {jobStatus.errors && jobStatus.errors.length > 0 && (
                <div className="border border-amber-200 rounded-md overflow-hidden bg-white">
                  <div className="bg-amber-50 px-2 py-1 flex items-center gap-1.5 text-xs text-amber-800 font-medium border-b border-amber-100">
                    <AlertCircle size={12} className="text-amber-600" />
                    <span>{jobStatus.errors.length} warning(s) during processing:</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto p-2 flex flex-col gap-1 text-[11px] font-mono text-amber-900">
                    {jobStatus.errors.map((e, idx) => (
                      <p key={idx} className="truncate">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

export default OutputPanel
