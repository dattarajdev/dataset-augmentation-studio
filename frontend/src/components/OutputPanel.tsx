import React, { useState, useEffect, useRef } from 'react'
import { Settings, Play, CheckCircle2, XCircle, AlertCircle, FolderOpen, FileOutput } from 'lucide-react'
import { SectionCard, Button, Alert } from './ui'
import { estimateOutput, generateDataset, getJobStatus } from '../api'
import type { AugmentationConfig, EstimateResponse, GenerateResponse, JobStatusResponse, ScanResponse } from '../api'

interface Props {
  datasetPath: string
  outputPath: string
  scanResult: ScanResponse | null
  augmentations: AugmentationConfig[]
  augEnabled: boolean
}

const OutputPanel: React.FC<Props> = ({
  datasetPath, outputPath, scanResult, augmentations, augEnabled
}) => {
  const [preserveOriginals, setPreserveOriginals] = useState(true)
  const [createClassesFile, setCreateClassesFile] = useState(true)
  const [validateOutput, setValidateOutput] = useState(true)
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
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
          clearInterval(pollRef.current!)
          setGenerating(false)
        }
      } catch {
        clearInterval(pollRef.current!)
        setGenerating(false)
      }
    }, 800)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleGenerate = async () => {
    if (!datasetPath || !outputPath) {
      setError('Please set both dataset and output paths.')
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
      setJobId(res.job_id)
      startPolling(res.job_id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || (err as Error)?.message || 'Generation failed'
      setError(msg)
      setGenerating(false)
    }
  }

  const canGenerate = !generating && !!datasetPath && !!outputPath && augEnabled && augmentations.length > 0

  return (
    <SectionCard number={5} title="Output & Generation" icon={<FileOutput size={18} />} color="#10b981">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column: estimate + generate button */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Paths summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                <FolderOpen size={12} /> Input
              </p>
              <p className="text-xs font-mono text-slate-700 truncate">{datasetPath || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                <FileOutput size={12} /> Output
              </p>
              <p className="text-xs font-mono text-slate-700 truncate">{outputPath || '—'}</p>
            </div>
          </div>

          {/* Estimated output */}
          {estimate && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-700">{estimate.original_count.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Original images</p>
              </div>
              <span className="text-slate-400 text-lg">+</span>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{estimate.augmented_count.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Augmented images</p>
              </div>
              <span className="text-slate-400 text-lg">=</span>
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{estimate.total_count.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total files</p>
              </div>
            </div>
          )}

          {!augEnabled && (
            <Alert type="warning">
              <AlertCircle size={14} />
              <span>Enable augmentation (Section 3) to generate an augmented dataset.</span>
            </Alert>
          )}

          {augEnabled && augmentations.length === 0 && (
            <Alert type="warning">
              <AlertCircle size={14} />
              <span>Select at least one transformation in the augmentation panel.</span>
            </Alert>
          )}

          {error && (
            <Alert type="error">
              <XCircle size={14} />
              <span>{error}</span>
            </Alert>
          )}

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!canGenerate}
            size="lg"
            className="w-full justify-center"
          >
            <Play size={18} />
            Generate Augmented Dataset
          </Button>

          {/* Progress */}
          {jobStatus && (
            <div className="fade-in flex flex-col gap-3">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">{jobStatus.message}</span>
                  <span className="text-xs text-slate-500">
                    {jobStatus.processed}/{jobStatus.total}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      jobStatus.status === 'done'
                        ? 'bg-emerald-500'
                        : jobStatus.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500 progress-animating'
                    }`}
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-slate-400">{Math.round(jobStatus.progress)}%</span>
                  <span className="text-xs text-slate-500">{jobStatus.output_count} files written</span>
                </div>
              </div>

              {/* Status badges */}
              {jobStatus.status === 'done' && (
                <Alert type="success">
                  <CheckCircle2 size={16} />
                  <span>
                    Generation complete! {jobStatus.output_count.toLocaleString()} files written to output folder.
                  </span>
                </Alert>
              )}
              {jobStatus.status === 'error' && (
                <Alert type="error">
                  <XCircle size={16} />
                  <span>Generation failed: {jobStatus.message}</span>
                </Alert>
              )}

              {/* Errors list */}
              {jobStatus.errors.length > 0 && (
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="bg-amber-50 px-3 py-1.5 flex items-center gap-2">
                    <AlertCircle size={13} className="text-amber-600" />
                    <p className="text-xs font-medium text-amber-700">
                      {jobStatus.errors.length} warning{jobStatus.errors.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2 flex flex-col gap-1">
                    {jobStatus.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-800 font-mono">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: settings */}
        <div className="lg:w-56 shrink-0">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Generation Settings</p>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={preserveOriginals}
                  onChange={e => setPreserveOriginals(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-slate-700">Preserve original files</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createClassesFile}
                  onChange={e => setCreateClassesFile(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-slate-700">Create class mapping file</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={validateOutput}
                  onChange={e => setValidateOutput(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-slate-700">Validate generated annotations</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

export default OutputPanel
